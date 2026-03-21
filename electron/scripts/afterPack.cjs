/**
 * afterPack.cjs - ビルド後バイナリ存在検証スクリプト
 *
 * electron-builder の afterPack フックとして実行される。
 * 必須バイナリが app.asar.unpacked に正しく展開されているかを確認する。
 */

const path = require('path');
const fs = require('fs');

const REQUIRED_BINARIES = {
    win32: [
        path.join('node_modules', '7zip-bin', 'win', 'x64', '7za.exe'),
        path.join('node_modules', 'ffmpeg-static', 'ffmpeg.exe'),
    ],
    darwin: [
        path.join('node_modules', '7zip-bin', 'mac', '7za'),
        path.join('node_modules', 'ffmpeg-static', 'ffmpeg'),
    ],
    linux: [
        path.join('node_modules', '7zip-bin', 'linux', 'x64', '7za'),
        path.join('node_modules', 'ffmpeg-static', 'ffmpeg'),
    ],
};

function removeIfExists(targetPath) {
    if (!fs.existsSync(targetPath)) {
        return;
    }
    fs.rmSync(targetPath, { recursive: true, force: true });
    console.log(`[afterPack] Removed: ${targetPath}`);
}

function pruneWindowsOnlyArtifacts(appOutDir) {
    const unpackedNodeModulesDir = path.join(
        appOutDir,
        'resources',
        'app.asar.unpacked',
        'node_modules'
    );

    const removeTargets = [
        path.join(unpackedNodeModulesDir, '7zip-bin', 'linux'),
        path.join(unpackedNodeModulesDir, '7zip-bin', 'mac'),
        path.join(unpackedNodeModulesDir, '7zip-bin', 'win', 'arm64'),
        path.join(unpackedNodeModulesDir, '7zip-bin', 'win', 'ia32'),
        path.join(unpackedNodeModulesDir, 'ffprobe-static', 'bin', 'darwin'),
        path.join(unpackedNodeModulesDir, 'ffprobe-static', 'bin', 'linux'),
        path.join(unpackedNodeModulesDir, 'ffprobe-static', 'bin', 'win32', 'ia32'),
    ];

    for (const targetPath of removeTargets) {
        removeIfExists(targetPath);
    }
}

function pruneBundledReleaseNotes(appOutDir, version) {
    const releaseNotesDir = path.join(appOutDir, 'resources', 'release-notes');
    if (!fs.existsSync(releaseNotesDir)) {
        return;
    }

    const normalizedVersion = String(version).trim().replace(/^v/i, '').replace(/-d/i, 'd');
    const keepFiles = new Set([
        `v${version}.md`,
        `v${normalizedVersion}.md`,
    ]);

    for (const entry of fs.readdirSync(releaseNotesDir, { withFileTypes: true })) {
        if (!entry.isFile() || keepFiles.has(entry.name)) {
            continue;
        }
        removeIfExists(path.join(releaseNotesDir, entry.name));
    }
}

/**
 * @param {import('electron-builder').AfterPackContext} context
 */
exports.default = async function afterPack(context) {
    const { appOutDir, packager } = context;
    const platform = packager.platform.name; // 'windows' | 'mac' | 'linux'
    const version = packager.appInfo.version;

    // electron-builder プラットフォーム名を Node.js 形式に変換
    const platformMap = { windows: 'win32', mac: 'darwin', linux: 'linux' };
    const nodeplatform = platformMap[platform] || process.platform;

    const unpackedDir = path.join(
        appOutDir,
        'resources',
        'app.asar.unpacked'
    );
    const preloadFallbackPath = path.join(
        appOutDir,
        'resources',
        'dist-electron',
        'preload.js'
    );
    const binaries = REQUIRED_BINARIES[nodeplatform] || [];
    const errors = [];

    for (const bin of binaries) {
        const fullPath = path.join(unpackedDir, bin);
        if (!fs.existsSync(fullPath)) {
            errors.push(`Missing binary: ${fullPath}`);
        } else {
            console.log(`[afterPack] ✓ Found: ${bin}`);
        }
    }

    if (errors.length > 0) {
        const msg = [
            '[afterPack] ❌ Required binaries are missing from app.asar.unpacked:',
            ...errors,
            '',
            'Make sure "asarUnpack" in package.json includes the relevant node_modules.',
        ].join('\n');
        // ビルドを失敗させる（CI で事前検知）
        throw new Error(msg);
    }

    if (!fs.existsSync(preloadFallbackPath)) {
        throw new Error(`[afterPack] ❌ Missing preload fallback: ${preloadFallbackPath}`);
    }

    console.log('[afterPack] ✓ Found preload fallback: resources/dist-electron/preload.js');

    if (nodeplatform === 'win32') {
        pruneWindowsOnlyArtifacts(appOutDir);
    }
    pruneBundledReleaseNotes(appOutDir, version);

    console.log(`[afterPack] ✓ All required binaries verified.`);
};
