import { app, dialog } from 'electron';
import fs from 'fs';
import os from 'os';
import path from 'path';

const fallbackLogPath = path.join(os.tmpdir(), 'MediaArchiver-v2-startup.log');
const fallbackLogBackupPath = `${fallbackLogPath}.1`;
const FALLBACK_LOG_MAX_BYTES = 512 * 1024;

function toErrorMessage(value: unknown): string {
    if (value instanceof Error) {
        return `${value.name}: ${value.message}\n${value.stack ?? ''}`;
    }
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}

function writeFallbackLog(message: string, error?: unknown): void {
    const line = `[${new Date().toISOString()}] ${message}${error !== undefined ? `\n${toErrorMessage(error)}` : ''}\n`;
    try {
        if (fs.existsSync(fallbackLogPath) && fs.statSync(fallbackLogPath).size >= FALLBACK_LOG_MAX_BYTES) {
            if (fs.existsSync(fallbackLogBackupPath)) {
                fs.rmSync(fallbackLogBackupPath, { force: true });
            }
            fs.renameSync(fallbackLogPath, fallbackLogBackupPath);
        }
        fs.appendFileSync(fallbackLogPath, line, { encoding: 'utf8' });
    } catch {
        // Last-resort logger: ignore write failures.
    }
}

process.on('uncaughtException', (error) => {
    writeFallbackLog('uncaughtException', error);
});

process.on('unhandledRejection', (reason) => {
    writeFallbackLog('unhandledRejection', reason);
});

void (async () => {
    writeFallbackLog('bootstrap:start');
    try {
        await import('./main');
        writeFallbackLog('bootstrap:main-imported');
    } catch (error) {
        writeFallbackLog('bootstrap:main-import-failed', error);
        try {
            dialog.showErrorBox(
                'MediaArchiver 起動エラー',
                `起動に失敗しました。\nログ: ${fallbackLogPath}`
            );
        } catch {
            // Ignore dialog errors in early startup.
        }
        app.quit();
    }
})();
