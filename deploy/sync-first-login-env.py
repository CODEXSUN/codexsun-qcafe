"""Copy validated first-login settings into the private VPS operator environment."""
from datetime import datetime, timezone
from pathlib import Path
import re
import sys

source = Path(sys.argv[1]).resolve()
target = Path(sys.argv[2]).resolve()

def read_env(path):
    values = {}
    for line in path.read_text().splitlines():
        if '=' in line and not line.lstrip().startswith('#'):
            key, value = line.split('=', 1)
            values[key.strip()] = value.strip()
    return values

def save_env(path, values):
    path.write_text(''.join(f'{key}={value}\n' for key, value in values.items()))
    path.chmod(0o600)

incoming = read_env(source)
code = incoming.get('OS_FIRST_LOGIN_SETUP_CODE', '')
expires_at = incoming.get('OS_FIRST_LOGIN_SETUP_EXPIRES_AT', '')
operator = read_env(target) if target.exists() else {}
if incoming.get('OS_FIRST_LOGIN_SETUP') == 'false':
    operator.update({
        'OS_FIRST_LOGIN_SETUP': 'false',
        'OS_FIRST_LOGIN_SETUP_CODE': '',
        'OS_FIRST_LOGIN_SETUP_EXPIRES_AT': '',
    })
    save_env(target, operator)
    print('First-login configuration disabled.')
    raise SystemExit(0)
if incoming.get('OS_FIRST_LOGIN_SETUP') != 'true' or not re.fullmatch(r'\d{10}', code):
    raise SystemExit('First-login setup must be enabled with a 10-digit code.')
try:
    expires = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
except ValueError as error:
    raise SystemExit('First-login expiry is invalid.') from error
if expires <= datetime.now(timezone.utc):
    raise SystemExit('First-login code has expired. Generate a new one locally.')

operator.update({
    'OS_FIRST_LOGIN_SETUP': 'true',
    'OS_FIRST_LOGIN_SETUP_CODE': code,
    'OS_FIRST_LOGIN_SETUP_EXPIRES_AT': expires_at,
})
save_env(target, operator)
print('First-login configuration synchronized.')
