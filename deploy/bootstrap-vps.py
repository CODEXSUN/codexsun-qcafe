"""Provision CODEXSUN-owned schemas without changing existing application data."""
import json
import os
from pathlib import Path
import re
import secrets
import subprocess
from datetime import datetime, timedelta, timezone
from urllib.parse import quote, urlsplit, urlunsplit

root = Path('/home/codexsun-os/deploy').resolve()
config = root / 'config'
config.mkdir(parents=True, exist_ok=True)

def read_env(path):
    result = {}
    for line in Path(path).read_text().splitlines():
        if '=' in line and not line.lstrip().startswith('#'):
            key, value = line.split('=', 1)
            result[key.strip()] = value.strip().strip('\"').strip("'")
    return result

def save_env(path, values):
    path.write_text(''.join(f'{key}={value}\n' for key, value in values.items()))
    path.chmod(0o600)

target = config / 'services.env'
if not target.exists():
    operator = read_env(config / 'operator.env')
    password = secrets.token_hex(32)
    inherited = read_env('/home/cxapp/.env')
    redis = urlsplit(inherited['CXAPP_REDIS_URL'])
    redis_url = urlunsplit((redis.scheme, redis.netloc.replace('127.0.0.1', 'cxapp-redis').replace('localhost', 'cxapp-redis'), redis.path, '', ''))
    settings = {
        'NODE_ENV': 'production', 'OS_API_HOST': '0.0.0.0', 'OS_DATABASE_REQUIRED': 'true',
        'DATABASE_URL': f'mysql://codexsun_os:{password}@cxapp-mariadb:3306/codexsun_os',
        'CHAT_DATABASE_URL': f'mysql://codexsun_chat:{password}@cxapp-mariadb:3306/codexsun_chat',
        'OS_IDENTITY_TOKEN_SECRET': secrets.token_hex(48), 'OS_IDENTITY_URL': 'http://platform:4100',
        'OS_SUPER_ADMIN_EMAIL': operator['OS_SUPER_ADMIN_EMAIL'], 'OS_SUPER_ADMIN_PASSWORD': operator['OS_SUPER_ADMIN_PASSWORD'],
        'OS_COOKIE_AUTH': 'true', 'OS_REDIS_ENABLED': 'true', 'OS_REDIS_URL': redis_url,
        'CHAT_API_HOST': '0.0.0.0', 'CHAT_ALLOWED_ORIGINS': 'https://os.codexsun.com',
        'ZETRO_API_HOST': '0.0.0.0', 'ZETRO_WORKSPACE_DATABASE_FILE': '/data/workspace.db',
        'ZETRO_DATABASE_FILE': '/data/zetro.db', 'AI_TASK_DATABASE_FILE': '/data/ai-tasks.db',
        'ZETRO_SETTINGS_FILE': '/data/settings.json', 'ZETRO_PROJECTS_ROOT': '/projects', 'ZETRO_AGENTS_FILE': '/config/agents.json',
        'DCS_ALLOWED_ORIGINS': 'https://os.codexsun.com',
    }
    save_env(target, settings)
else:
    settings = read_env(target)
operator = read_env(config / 'operator.env')
for key in ['OS_SUPER_ADMIN_EMAIL', 'OS_SUPER_ADMIN_PASSWORD']:
    settings[key] = operator[key]
settings['OS_FIRST_LOGIN_SETUP'] = operator.get('OS_FIRST_LOGIN_SETUP', settings.get('OS_FIRST_LOGIN_SETUP', 'false'))
settings.setdefault('OS_FIRST_LOGIN_SETUP_CODE', '')
settings.setdefault('OS_FIRST_LOGIN_SETUP_EXPIRES_AT', '')
if settings['OS_FIRST_LOGIN_SETUP'] == 'true':
    expires_at = operator.get('OS_FIRST_LOGIN_SETUP_EXPIRES_AT', '')
    try:
        expired = datetime.fromisoformat(expires_at.replace('Z', '+00:00')) <= datetime.now(timezone.utc)
    except ValueError:
        expired = True
    if not re.fullmatch(r'\d{10}', operator.get('OS_FIRST_LOGIN_SETUP_CODE', '')) or expired:
        operator['OS_FIRST_LOGIN_SETUP_CODE'] = ''.join(str(secrets.randbelow(10)) for _ in range(10))
        operator['OS_FIRST_LOGIN_SETUP_EXPIRES_AT'] = (datetime.now(timezone.utc) + timedelta(minutes=30)).isoformat().replace('+00:00', 'Z')
        save_env(config / 'operator.env', operator)
    settings['OS_FIRST_LOGIN_SETUP_CODE'] = operator['OS_FIRST_LOGIN_SETUP_CODE']
    settings['OS_FIRST_LOGIN_SETUP_EXPIRES_AT'] = operator['OS_FIRST_LOGIN_SETUP_EXPIRES_AT']
save_env(target, settings)
settings.setdefault('ZXA_API_TOKEN', secrets.token_hex(32))
save_env(target, settings)
groups = {
    'platform': ['NODE_ENV', 'OS_API_HOST', 'OS_DATABASE_REQUIRED', 'DATABASE_URL', 'OS_IDENTITY_TOKEN_SECRET', 'OS_SUPER_ADMIN_EMAIL', 'OS_SUPER_ADMIN_PASSWORD', 'OS_FIRST_LOGIN_SETUP', 'OS_FIRST_LOGIN_SETUP_CODE', 'OS_FIRST_LOGIN_SETUP_EXPIRES_AT', 'OS_COOKIE_AUTH', 'OS_REDIS_ENABLED', 'OS_REDIS_URL'],
    'chat': ['NODE_ENV', 'OS_IDENTITY_URL', 'CHAT_DATABASE_URL', 'OS_REDIS_ENABLED', 'OS_REDIS_URL', 'CHAT_API_HOST', 'CHAT_ALLOWED_ORIGINS'],
    'zetro': ['NODE_ENV', 'OS_IDENTITY_URL', 'ZETRO_API_HOST', 'ZETRO_WORKSPACE_DATABASE_FILE', 'ZETRO_DATABASE_FILE', 'AI_TASK_DATABASE_FILE', 'ZETRO_SETTINGS_FILE', 'ZETRO_PROJECTS_ROOT', 'ZETRO_AGENTS_FILE', 'ZXA_API_TOKEN'],
    'dcs': ['OS_IDENTITY_URL', 'DCS_ALLOWED_ORIGINS'],
}
settings['DCS_ALLOWED_ORIGINS'] = 'https://os.codexsun.com,http://tauri.localhost,https://tauri.localhost,tauri://localhost'
settings['CHAT_ALLOWED_ORIGINS'] = settings['DCS_ALLOWED_ORIGINS']
for name, keys in groups.items(): save_env(config / f'{name}.env', {key: settings[key] for key in keys})
zxa_env = config / 'zxa.env'
if not zxa_env.exists(): save_env(zxa_env, {'ZXA_TOKEN': settings['ZXA_API_TOKEN'], 'ZXA_REQUEST_TIMEOUT_MS': '180000', 'ZXA_DEFAULT_PROVIDER': 'c'})

for key, database, user in [('DATABASE_URL', 'codexsun_os', 'codexsun_os'), ('CHAT_DATABASE_URL', 'codexsun_chat', 'codexsun_chat')]:
    password = urlsplit(settings[key]).password
    if not password or any(c not in '0123456789abcdef' for c in password):
        raise RuntimeError('Unexpected managed database credential format')
    sql = f"CREATE DATABASE IF NOT EXISTS {database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE USER IF NOT EXISTS '{user}'@'%' IDENTIFIED BY '{password}'; GRANT ALL ON {database}.* TO '{user}'@'%';"
    result = subprocess.run(['docker', 'exec', '-i', 'cxapp-mariadb', 'sh', '-c', 'MYSQL_PWD="${MARIADB_ROOT_PASSWORD:-$MYSQL_ROOT_PASSWORD}" exec mariadb -uroot'], input=sql, text=True, capture_output=True)
    if result.returncode:
        raise RuntimeError('Managed schema provisioning failed; no credentials were logged')

for name in ['zetro', 'projects', 'filebrowser', 'dcs']:
    path = root / 'state' / name
    path.mkdir(parents=True, exist_ok=True)
    os.chown(path, 1000, 1000)
    path.chmod(0o700)
agents = config / 'agents.json'
if not agents.exists() or agents.read_text().strip() == '[]':
    agents.write_text(json.dumps([{'id': 'zxa', 'name': 'ZXA', 'duty': 'Plan and review work using configured isolated model connections.', 'skills': [], 'url': 'http://zxa:4200', 'tokenEnv': 'ZXA_API_TOKEN'}]))
os.chown(agents, 1000, 1000)
agents.chmod(0o600)
file_database = root / 'state/filebrowser/filebrowser.db'
file_ready = root / 'state/filebrowser/.provisioned'
if not file_ready.exists() or file_ready.read_text() != 'proxy-v1:' + settings['OS_SUPER_ADMIN_EMAIL']:
    command = ['docker', 'run', '--rm', '--user', '1000:1000', '--entrypoint', 'filebrowser',
               '-v', str(root / 'state/filebrowser') + ':/database',
               '-v', str(root / 'state/projects') + ':/srv', 'cxapp/media:1.0.44-filebrowser2.63.5']
    operations = []
    if not file_database.exists():
        operations.append(['config', 'init', '--database', '/database/filebrowser.db'])
    operations.append(['config', 'set', '--database', '/database/filebrowser.db', '--root', '/srv', '--baseURL', '/files', '--auth.method', 'proxy', '--auth.header', 'X-Remote-User', '--disableExec=true'])
    operations.append(['users', 'add', settings['OS_SUPER_ADMIN_EMAIL'], secrets.token_urlsafe(32), '--database', '/database/filebrowser.db', '--perm.admin', '--scope', '/'])
    for operation in operations:
        result = subprocess.run(command + operation, capture_output=True, text=True)
        if result.returncode and 'already exists' not in (result.stderr + result.stdout).lower():
            safe_error = (result.stderr + result.stdout).replace(operation[3] if operation[0] == 'users' else 'unused-placeholder', '[redacted]')
            raise RuntimeError('File Browser initialization failed: ' + safe_error[-500:])
    file_ready.write_text('proxy-v1:' + settings['OS_SUPER_ADMIN_EMAIL'])
print('CODEXSUN schemas and runtime configuration are ready. Existing application schemas were preserved.')
