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
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (!id.includes('node_modules')) return undefined;

                    if (id.includes('lucide-react')) {
                        return 'vendor-icons';
                    }

                    if (id.includes('@tanstack/react-virtual')) {
                        return 'vendor-virtual';
                    }

                    if (id.includes('zustand') || id.includes('sonner')) {
                        return 'vendor-state';
                    }

                    if (
                        id.includes('/react/') ||
                        id.includes('\\react\\') ||
                        id.includes('/react-dom/') ||
                        id.includes('\\react-dom\\') ||
                        id.includes('/scheduler/') ||
                        id.includes('\\scheduler\\')
                    ) {
                        return 'vendor-react';
                    }

                    return 'vendor-misc';
                },
            },
        },
    },
    test: {
        environment: 'node',
        include: ['src/**/*.test.ts'],
    },
}));
