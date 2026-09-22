const { execFileSync } = require('node:child_process');

const SERVICE_NAME = 'CODEXSUNQCafePrint';
const DISPLAY_NAME = 'CODEXSUN Q Cafe Windows Print Service';
const executable = process.argv[2];

if (!executable) {
  throw new Error('Q Cafe print-service executable path is missing.');
}

function runSc(args, allowFailure = false) {
  try {
    return execFileSync('sc.exe', args, { encoding: 'utf8', windowsHide: true });
  } catch (error) {
    if (allowFailure) return null;
    const output = [error.stdout, error.stderr].filter(Boolean).join('\n').trim();
    throw new Error(output || `sc.exe ${args[0]} failed with exit code ${error.status ?? 'unknown'}.`);
  }
}

function wait(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function waitForRunningService() {
  let status = '';
  for (let attempt = 0; attempt < 10; attempt += 1) {
    status = runSc(['query', SERVICE_NAME], true) ?? '';
    if (/STATE\s*:\s*4\s+RUNNING/u.test(status)) return;
    wait(300);
  }
  throw new Error(`Q Cafe print service was not running after installation. ${status}`.trim());
}

runSc(['stop', SERVICE_NAME], true);
if (!runSc(['query', SERVICE_NAME], true)) {
  runSc([
    'create', SERVICE_NAME,
    'binPath=', `"${executable}"`,
    'start=', 'auto',
    'DisplayName=', DISPLAY_NAME,
  ]);
} else {
  runSc([
    'config', SERVICE_NAME,
    'binPath=', `"${executable}"`,
    'start=', 'auto',
    'DisplayName=', DISPLAY_NAME,
  ]);
}
runSc(['start', SERVICE_NAME], true);
waitForRunningService();
