"""Fetch hash-pinned installers and enforce the CA policy in a Docker build.

Usage: python bootstrap.py /usr/local/bin/python3 [/app/.venv/bin/python]
Keep this file beside wheels.json and patch-python.py. No registry credentials
or application secrets are required. Failure stops image publication.
"""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import urllib.request

root = Path(__file__).resolve().parent
assert root == Path('/opt/security-ca')
interpreters = sys.argv[1:]
assert interpreters and all(Path(p).is_absolute() and Path(p).is_file() for p in interpreters)
wheels = root / 'wheels'
wheels.mkdir(exist_ok=True)
try:
    for name, info in json.loads((root / 'wheels.json').read_text()).items():
        data = urllib.request.urlopen(info['url'], timeout=60).read()
        assert hashlib.sha256(data).hexdigest() == info['sha256'], 'Installer digest mismatch: ' + name
        (wheels / name).write_bytes(data)
    subprocess.run([interpreters[0], str(root / 'patch-python.py'), 'system'], check=True)
    for interpreter in interpreters:
        subprocess.run([interpreter, str(root / 'patch-python.py')], check=True)
        subprocess.run([interpreter, str(root / 'patch-python.py'), 'verify'], check=True)
    subprocess.run(['sh', str(root / 'check-system-ca.sh')], check=True)
finally:
    shutil.rmtree(wheels)
