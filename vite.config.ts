import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 5173,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.OPENAI_API_KEY': JSON.stringify(env.OPENAI_API_KEY),
        'process.env.ANTHROPIC_API_KEY': JSON.stringify(env.ANTHROPIC_API_KEY),
        'process.env.OLLAMA_ENDPOINT': JSON.stringify(env.OLLAMA_ENDPOINT || 'http://localhost:11434'),
        'process.env.NODE_ENV': JSON.stringify(mode),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        outDir: 'dist',
        rollupOptions: {
          external: [
            'electron',
            '@modelcontextprotocol/sdk',
            'cross-spawn',
            'node:process',
            'node:stream',
            'child_process',
            'fs',
            'path',
            'os'
          ],
          output: {
            manualChunks: {
              'vendor': [
                'react',
                'react-dom',
                'axios',
              ],
              'ui': [
                // UI/styling libraries if applicable
              ],
            },
          },
        },
        chunkSizeWarningLimit: 1000, // Increase if needed after splitting
      }
    };
});
