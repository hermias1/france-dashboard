"""Offline, bounded emSign remediation for application-owned Python environments."""
import hashlib
import importlib.util
import json
import os
import pathlib
import re
import shutil
import ssl
import subprocess
import sys
import sysconfig
import zipfile

WHEELS = pathlib.Path('/opt/security-ca/wheels')
PIP = WHEELS / 'pip-26.2.2-py3-none-any.whl'
CERTIFI = WHEELS / 'certifi-2026.10.19-py3-none-any.whl'
BAD = {
    '86a1ecba089c4a8d3bbe2734c612ba341d813e043cf9e8a862cd5c57a36bbe6b',
    'd7a7a0fb5d7e2731d771e9484ebcdef71d5f0c3e0a2948782bc83ee0ea699ef4',
}
PIP_COMMAND = [sys.executable, '-c',
               "import sys,runpy;sys.path.insert(0,sys.argv.pop(1));runpy.run_module('pip',run_name='__main__')",
               str(PIP)]


def run(*args):
    return subprocess.run(args, check=True, text=True, capture_output=True).stdout.strip()


def check_store(path=None):
    context = ssl.create_default_context(cafile=path)
    roots = {hashlib.sha256(c).hexdigest() for c in context.get_ca_certs(binary_form=True)}
    assert len(roots) > 50, 'Unexpectedly small trust store'
    assert not (roots & BAD), 'Distrusted root remains in ' + str(path)


def pip_check():
    result = subprocess.run([*PIP_COMMAND, 'check'], text=True, capture_output=True)
    assert result.returncode in (0, 1), result.stderr
    return set(result.stdout.strip().splitlines()) - {'No broken requirements found.'}


def certificate_hashes(data):
    return {hashlib.sha256(ssl.PEM_cert_to_DER_cert(p.decode())).hexdigest()
            for p in re.findall(rb'-----BEGIN CERTIFICATE-----.*?-----END CERTIFICATE-----', data, re.S)}


def purge_bundle(path):
    data = path.read_bytes()
    def retain(match):
        return b'' if certificate_hashes(match[0]) & BAD else match[0]
    updated = re.sub(rb'-----BEGIN CERTIFICATE-----.*?-----END CERTIFICATE-----', retain, data, flags=re.S)
    if updated != data:
        path.write_bytes(updated)
        print('Removed distrusted roots from', path)


def system_bundles():
    paths = {pathlib.Path('/etc/ssl/cert.pem'), pathlib.Path('/etc/ssl/certs/ca-certificates.crt')}
    for directory in ['/etc/ssl/certs', '/usr/share/ca-certificates', '/usr/local/share/ca-certificates']:
        for p in pathlib.Path(directory).rglob('*'):
            if p.is_file():
                paths.add(p.resolve())
    return sorted({p.resolve() for p in paths if p.is_file()})


def packaged_bundles():
    # Enumerate alternate vendored bundles (notably botocore), including venvs.
    for directory in dict.fromkeys(sys.path):
        if directory and directory.endswith(('site-packages', 'dist-packages')):
            for name in ('cacert.pem', 'ca-bundle.crt'):
                yield from pathlib.Path(directory).rglob(name)


def verify_seeds():
    spec = importlib.util.find_spec('ensurepip')
    if not spec:
        return
    directories = [pathlib.Path(spec.origin).parent / '_bundled']
    if sysconfig.get_config_var('WHEEL_PKG_DIR'):
        directories.append(pathlib.Path(sysconfig.get_config_var('WHEEL_PKG_DIR')))
    for directory in directories:
        for wheel in directory.glob('pip-*.whl'):
            with zipfile.ZipFile(wheel) as archive:
                for name in archive.namelist():
                    if name.endswith('cacert.pem'):
                        assert not certificate_hashes(archive.read(name)) & BAD, 'Unsafe pip seed: ' + str(wheel)


def main():
    if sys.argv[1:] == ['system']:
        for path in system_bundles():
            purge_bundle(path)
        check_store('/etc/ssl/certs/ca-certificates.crt')
        return
    if sys.argv[1:] == ['verify']:
        check_store()
        for name in ('SSL_CERT_FILE', 'REQUESTS_CA_BUNDLE', 'CURL_CA_BUNDLE', 'PIP_CERT'):
            if os.environ.get(name):
                check_store(os.environ[name])
        for name in ('certifi', 'pip._vendor.certifi'):
            try:
                module = __import__(name, fromlist=['where'])
            except ModuleNotFoundError:
                continue
            check_store(module.where())
        for path in packaged_bundles():
            assert not certificate_hashes(path.read_bytes()) & BAD, 'Unsafe vendored bundle: ' + str(path)
        for directory in os.environ.get('SSL_CERT_DIR', '').split(os.pathsep):
            if directory:
                for path in pathlib.Path(directory).iterdir():
                    if path.is_file():
                        assert not certificate_hashes(path.read_bytes()) & BAD, 'Unsafe SSL_CERT_DIR entry'
        verify_seeds()
        for path in system_bundles():
            assert not certificate_hashes(path.read_bytes()) & BAD, 'Unsafe system CA source: ' + str(path)
        if shutil.which('uv'):
            assert run('uv', '--version').startswith('uv 0.13.4 '), 'Unpatched uv executable'
        print(sys.executable, 'trust stores verified')
        return

    before = pip_check()
    packages = []
    if importlib.util.find_spec('pip'):
        packages.append(str(PIP))
    if importlib.util.find_spec('certifi'):
        packages.append(str(CERTIFI))
    if packages:
        print(run(*PIP_COMMAND, 'install', '--no-index', '--no-deps',
                  '--no-cache-dir', '--disable-pip-version-check', '--upgrade', *packages))
    after = pip_check()
    assert not (after - before), 'New dependency conflicts: ' + repr(after - before)
    if sys.prefix == sys.base_prefix and shutil.which('uv'):
        assert not importlib.util.find_spec('uv'), 'Packaged uv requires separate handling'
        assert shutil.which('uv') == '/usr/local/bin/uv', 'Unknown uv installation'
        with zipfile.ZipFile(WHEELS / 'uv-0.13.4-py3-none-musllinux_1_1_x86_64.whl') as wheel:
            for name in ('uv', 'uvx'):
                destination = pathlib.Path('/usr/local/bin') / name
                destination.unlink(missing_ok=True)
                destination.write_bytes(wheel.read('uv-0.13.4.data/scripts/' + name))
                destination.chmod(0o755)

    # ensurepip otherwise recreates an old pip and its bundled roots in new venvs.
    spec = importlib.util.find_spec('ensurepip')
    if spec and spec.origin:
        source = pathlib.Path(spec.origin)
        body = source.read_text()
        body, count = re.subn(r'(?m)^_PIP_VERSION = [\'"][^\'"]+[\'"]',
                              '_PIP_VERSION = "26.2.2"', body)
        assert count == 1, 'Unknown ensurepip layout'
        source.write_text(body)
        bundled = source.parent / '_bundled'
        bundled.mkdir(exist_ok=True)
        for old in bundled.glob('pip-*.whl'):
            old.unlink()
        shutil.copy2(PIP, bundled / PIP.name)
        wheel_directory = sysconfig.get_config_var('WHEEL_PKG_DIR')
        if wheel_directory:
            wheel_directory = pathlib.Path(wheel_directory)
            wheel_directory.mkdir(exist_ok=True)
            for old in wheel_directory.glob('pip-*.whl'):
                old.unlink()
            shutil.copy2(PIP, wheel_directory / PIP.name)
    # Do not silently overlook virtualenv's separate embedded installers.
    spec = importlib.util.find_spec('virtualenv')
    if spec:
        raise RuntimeError('virtualenv requires a separately reviewed seed update')
    for path in packaged_bundles():
        purge_bundle(path)
    check_store()
    print(json.dumps({'python': sys.executable, 'baseline_conflicts': sorted(before)}))


if __name__ == '__main__':
    main()
