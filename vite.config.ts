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
                        emptyOutDir: true,
                        rollupOptions: {
                            external: electronExternal,
                            output: {
                                entryFileNames: '[name].js',
                                chunkFileNames: '[name].js',
                                assetFileNames: '[name][extname]',
                            },
                        },
                    },
                },
            },
            preload: {
                input: 'electron/preload.ts',
                vite: {
                    build: {
                        emptyOutDir: false,
                        rollupOptions: {
                            output: {
                                entryFileNames: '[name].js',
                                chunkFileNames: '[name].js',
                                assetFileNames: '[name][extname]',
                            },
                        },
                    },
                },
            },
        })),
        ...electronFlat({
            entry: 'electron/utility/previewFrameWorker.ts',
            vite: {
                build: {
                    emptyOutDir: false,
                    rollupOptions: {
                        external: electronExternal,
                        output: {
                            entryFileNames: '[name].js',
                            chunkFileNames: '[name].js',
                            assetFileNames: '[name][extname]',
                        },
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
                    const normalizedId = id.replace(/\\/g, '/');

                    if (normalizedId.includes('/src/components/RightPanel/')) {
                        return 'feature-right-panel';
                    }

                    if (
                        normalizedId.includes('/src/features/center-viewer/') ||
                        normalizedId.includes('/src/components/lightbox/')
                    ) {
                        return 'feature-center-viewer';
                    }

                    if (normalizedId.endsWith('/src/components/DuplicateView.tsx')) {
                        return 'feature-duplicates';
                    }

                    if (!normalizedId.includes('node_modules')) return undefined;

                    if (normalizedId.includes('lucide-react')) {
                        return 'vendor-icons';
                    }

                    if (normalizedId.includes('recharts')) {
                        return 'vendor-charts';
                    }

                    if (normalizedId.includes('@tanstack/react-virtual')) {
                        return 'vendor-virtual';
                    }

                    if (normalizedId.includes('zustand') || normalizedId.includes('sonner')) {
                        return 'vendor-state';
                    }

                    if (
                        normalizedId.includes('/react/') ||
                        normalizedId.includes('/react-dom/') ||
                        normalizedId.includes('/scheduler/')
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
