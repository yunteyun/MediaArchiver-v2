const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function runNodeCommand(entryPath, args = [], cwd) {
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [entryPath, ...args], {
            cwd,
            stdio: 'inherit',
        });

        child.on('error', reject);
        child.on('exit', (code, signal) => {
            if (signal) {
                process.kill(process.pid, signal);
                return;
            }

            if ((code ?? 0) === 0) {
                resolve();
                return;
            }

            reject(new Error(`${path.basename(entryPath)} failed with exit code ${code ?? 1}`));
        });
    });
}

async function main() {
    const projectRoot = path.resolve(__dirname, '../../');
    const packageJsonPath = path.join(projectRoot, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const outputDir = packageJson.build?.directories?.output || 'release';
    const outputPath = path.join(projectRoot, outputDir);
    const distPath = path.join(projectRoot, 'dist');
    const distElectronPath = path.join(projectRoot, 'dist-electron');

    await fs.promises.rm(outputPath, { recursive: true, force: true });
    await fs.promises.rm(distPath, { recursive: true, force: true });
    await fs.promises.rm(distElectronPath, { recursive: true, force: true });

    const viteCli = path.join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js');
    await runNodeCommand(viteCli, ['build'], projectRoot);

    const builderCli = path.join(projectRoot, 'node_modules', 'electron-builder', 'cli.js');
    await runNodeCommand(builderCli, process.argv.slice(2), projectRoot);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
