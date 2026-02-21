import log from 'electron-log/main';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';

type StorageMode = 'appdata' | 'install' | 'custom';
interface StorageConfigLike {
    mode: StorageMode;
    customPath?: string;
}

function getRuntimeScope(): 'dev' | 'release' {
    return process.env.VITE_DEV_SERVER_URL ? 'dev' : 'release';
}

function resolveBasePath(config: StorageConfigLike): string {
    switch (config.mode) {
        case 'appdata':
            return path.join(app.getPath('userData'), getRuntimeScope());
        case 'install': {
            const exeDir = path.dirname(app.getPath('exe'));
            const isDev = process.env.VITE_DEV_SERVER_URL !== undefined;
            return isDev ? path.join(app.getPath('userData'), 'dev') : path.join(exeDir, 'data');
        }
        case 'custom':
            return config.customPath ?? app.getPath('userData');
    }
}

function resolveLogsPath(): string {
    const userDataPath = app.getPath('userData');
    const bootstrapConfigPath = path.join(userDataPath, 'storage-config.json');
    let config: StorageConfigLike = { mode: 'appdata' };

    if (fs.existsSync(bootstrapConfigPath)) {
        try {
            config = JSON.parse(fs.readFileSync(bootstrapConfigPath, 'utf-8')) as StorageConfigLike;
        } catch {
            config = { mode: 'appdata' };
        }
    }

    const candidateBase = resolveBasePath(config);
    const candidateConfigPath = path.join(candidateBase, 'storage-config.json');

    if (candidateBase !== userDataPath && fs.existsSync(candidateConfigPath)) {
        try {
            const finalConfig = JSON.parse(fs.readFileSync(candidateConfigPath, 'utf-8')) as StorageConfigLike;
            return path.join(resolveBasePath(finalConfig), 'logs');
        } catch {
            // fallback to bootstrap config
        }
    }

    return path.join(candidateBase, 'logs');
}

const logsPath = resolveLogsPath();
if (!fs.existsSync(logsPath)) {
    fs.mkdirSync(logsPath, { recursive: true });
}

log.transports.file.resolvePathFn = () => {
    const date = new Date().toISOString().split('T')[0];
    return path.join(logsPath, `app-${date}.log`);
};

log.transports.file.level = 'info';
log.transports.console.level = 'debug';

log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';
log.transports.console.format = '[{h}:{i}:{s}] [{level}] {text}';

log.transports.file.maxSize = 10 * 1024 * 1024;

log.initialize();

export const logger = {
    debug: (message: string, ...args: any[]) => {
        log.debug(message, ...args);
    },

    info: (message: string, ...args: any[]) => {
        log.info(message, ...args);
    },

    warn: (message: string, ...args: any[]) => {
        log.warn(message, ...args);
    },

    error: (message: string, ...args: any[]) => {
        log.error(message, ...args);
    },

    scope: (moduleName: string) => {
        return {
            debug: (message: string, ...args: any[]) => log.debug(`[${moduleName}] ${message}`, ...args),
            info: (message: string, ...args: any[]) => log.info(`[${moduleName}] ${message}`, ...args),
            warn: (message: string, ...args: any[]) => log.warn(`[${moduleName}] ${message}`, ...args),
            error: (message: string, ...args: any[]) => log.error(`[${moduleName}] ${message}`, ...args),
        };
    },

    getLogPath: () => logsPath,

    getRecentLogs: async (lines: number = 100): Promise<string[]> => {
        const date = new Date().toISOString().split('T')[0];
        const logFile = path.join(logsPath, `app-${date}.log`);

        if (!fs.existsSync(logFile)) {
            return [];
        }

        const content = fs.readFileSync(logFile, 'utf-8');
        const allLines = content.split('\n').filter(line => line.trim());
        return allLines.slice(-lines);
    }
};

export default logger;
