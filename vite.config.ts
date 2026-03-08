import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron/simple';
import electronFlat from 'vite-plugin-electron';
import path from 'path';

const electronExternal = ['better-sqlite3', 'sharp', 'fluent-ffmpeg', 'ffmpeg-static', 'ffprobe-static'];

export default defineConfig(async () => ({
    plugins: [
        react(),
        ...(await electron({
            main: {
                entry: 'electron/bootstrap.ts',
                vite: {
                    build: {
                        rollupOptions: {
                            external: electronExternal,
                        },
                    },
                },
            },
            preload: {
                input: 'electron/preload.ts',
            },
        })),
        ...electronFlat({
            entry: 'electron/utility/previewFrameWorker.ts',
            vite: {
                build: {
                    rollupOptions: {
                        external: electronExternal,
                    },
                },
            },
            onstart() {
                // Build the utility-process entry during dev without starting another Electron app.
            },
        }),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    test: {
        environment: 'node',
        include: ['src/**/*.test.ts'],
    },
}));
