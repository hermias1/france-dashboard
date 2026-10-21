#!/bin/sh
set -eu
bundle=/etc/ssl/certs/ca-certificates.crt
pkcs7=$(openssl crl2pkcs7 -nocrl -certfile "$bundle")
subjects=$(printf '%s\n' "$pkcs7" | openssl pkcs7 -print_certs -noout)
count=$(printf '%s\n' "$subjects" | grep -c '^subject=')
test "$count" -gt 50
if printf '%s\n' "$subjects" | grep -Eq 'emSign ECC Root CA - G3|AAA Certificate Services'; then
    echo 'Distrusted root remains in system bundle' >&2
    exit 1
fi
echo 'System CA bundle verified'
