const { spawn } = require('node:child_process');
const path = require('node:path');

function stripWindowsDevicePrefix(value = '') {
  return value.startsWith('\\\\?\\') ? value.slice(4) : value;
}

function normalizePathList(value = '') {
  return value
    .split(';')
    .map((entry) => stripWindowsDevicePrefix(entry))
    .join(';');
}

const packageJsonPath = stripWindowsDevicePrefix(
  process.env.npm_package_json || path.join(process.cwd(), 'package.json'),
);
const projectRoot = path.dirname(packageJsonPath);
const viteCliPath = path.join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js');
const packageJsonNormalizedPath = path.join(projectRoot, 'package.json');

const env = {
  ...process.env,
  INIT_CWD: projectRoot,
  npm_config_local_prefix: projectRoot,
  npm_package_json: packageJsonNormalizedPath,
};

const pathKey = Object.keys(process.env).find((key) => key.toUpperCase() === 'PATH');
if (pathKey) {
  env[pathKey] = normalizePathList(process.env[pathKey]);
}

const child = spawn(process.execPath, [viteCliPath, ...process.argv.slice(1)], {
  cwd: projectRoot,
  env,
  stdio: 'inherit',
});

child.on('error', (error) => {
  console.error(error);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
