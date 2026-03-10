const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

async function main() {
    const packageJsonPath = path.resolve(__dirname, '../../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const outputDir = packageJson.build?.directories?.output || 'release';
    const outputPath = path.resolve(__dirname, '../../', outputDir);

    await fs.promises.rm(outputPath, { recursive: true, force: true });

    const builderBin = path.resolve(__dirname, '../../node_modules/.bin/electron-builder.cmd');
    const child = spawn(builderBin, process.argv.slice(2), {
        cwd: path.resolve(__dirname, '../../'),
        stdio: 'inherit',
        shell: true,
    });

    child.on('exit', (code, signal) => {
        if (signal) {
            process.kill(process.pid, signal);
            return;
        }
        process.exit(code ?? 1);
    });
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
