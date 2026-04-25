import { spawn, type ChildProcess } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { app } from 'electron';

export interface MpvEventCallbacks {
    onTimePos: (sec: number) => void;
    onDuration: (sec: number) => void;
    onPause: (paused: boolean) => void;
    onEnded: () => void;
    onError: (msg: string) => void;
}

function resolveMpvPath(): string {
    if (app.isPackaged) {
        return path.join(process.resourcesPath, 'mpv', 'mpv.exe');
    }
    return path.join(process.cwd(), 'resources', 'mpv', 'mpv.exe');
}

export function isMpvAvailable(): boolean {
    return fs.existsSync(resolveMpvPath());
}

class MpvService {
    private process: ChildProcess | null = null;
    private socket: net.Socket | null = null;
    private pipeName = '';
    private callbacks: MpvEventCallbacks | null = null;
    private lineBuffer = '';

    setCallbacks(cb: MpvEventCallbacks): void {
        this.callbacks = cb;
    }

    async spawn(
        filePath: string,
        hwnd: number,
        startTime: number | null,
        volume: number,
    ): Promise<void> {
        this.quit();

        const mpvPath = resolveMpvPath();
        if (!fs.existsSync(mpvPath)) {
            throw new Error(`mpv not found: ${mpvPath}`);
        }

        const id = crypto.randomBytes(4).toString('hex');
        this.pipeName = `\\\\.\\pipe\\mpv-mediaarchiver-${id}`;

        const args = [
            `--wid=${hwnd}`,
            '--no-border',
            '--no-osc',
            '--no-osd-bar',
            '--keep-open=yes',
            `--volume=${Math.round(volume * 100)}`,
            `--input-ipc-server=${this.pipeName}`,
        ];

        if (startTime !== null && startTime > 0) {
            args.push(`--start=${startTime}`);
        }

        args.push(filePath);

        this.process = spawn(mpvPath, args, { stdio: 'ignore', detached: false });

        this.process.on('exit', () => {
            this.callbacks?.onEnded();
            this.socket?.destroy();
            this.socket = null;
        });

        await this.connectIpc();
        this.observeProperties();
    }

    private async connectIpc(): Promise<void> {
        const MAX_RETRIES = 20;
        const RETRY_DELAY_MS = 150;

        for (let i = 0; i < MAX_RETRIES; i++) {
            try {
                await new Promise<void>((resolve, reject) => {
                    const socket = net.createConnection(this.pipeName);
                    socket.once('connect', () => {
                        this.socket = socket;
                        this.setupSocketHandlers();
                        resolve();
                    });
                    socket.once('error', reject);
                });
                return;
            } catch {
                await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
            }
        }
        throw new Error('Failed to connect to mpv IPC after retries');
    }

    private setupSocketHandlers(): void {
        if (!this.socket) return;

        this.socket.on('data', (chunk: Buffer) => {
            this.lineBuffer += chunk.toString('utf8');
            const lines = this.lineBuffer.split('\n');
            this.lineBuffer = lines.pop() ?? '';

            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    this.handleEvent(JSON.parse(line) as Record<string, unknown>);
                } catch {
                    // ignore malformed JSON
                }
            }
        });

        this.socket.on('error', () => {
            // pipe closed or reset — mpv likely quit
        });
    }

    private handleEvent(msg: Record<string, unknown>): void {
        if (msg['event'] === 'property-change') {
            const name = msg['name'] as string;
            const data = msg['data'];
            if (name === 'time-pos' && typeof data === 'number') {
                this.callbacks?.onTimePos(data);
            } else if (name === 'duration' && typeof data === 'number') {
                this.callbacks?.onDuration(data);
            } else if (name === 'pause' && typeof data === 'boolean') {
                this.callbacks?.onPause(data);
            }
        } else if (msg['event'] === 'end-file') {
            if (msg['reason'] === 'eof') {
                this.callbacks?.onEnded();
            }
        }
    }

    private observeProperties(): void {
        this.sendRaw(['observe_property', 1, 'time-pos']);
        this.sendRaw(['observe_property', 2, 'duration']);
        this.sendRaw(['observe_property', 3, 'pause']);
    }

    private sendRaw(command: unknown[]): void {
        if (!this.socket?.writable) return;
        this.socket.write(JSON.stringify({ command }) + '\n');
    }

    command(args: unknown[]): void {
        this.sendRaw(args);
    }

    quit(): void {
        this.socket?.destroy();
        this.socket = null;
        this.lineBuffer = '';

        if (this.process) {
            try { this.process.kill(); } catch { /* already dead */ }
            this.process = null;
        }
    }
}

export const mpvService = new MpvService();
