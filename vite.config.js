import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execPromise = promisify(execFile);

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'google-sheet-sync-middleware',
      configureServer(server) {
        server.middlewares.use('/api/sync', async (req, res) => {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

          if (req.method === 'OPTIONS') {
            res.statusCode = 200;
            res.end();
            return;
          }

          try {
            const scriptPath = path.resolve(__dirname, 'scripts/sync_sheet.py');
            const jsonPath = path.resolve(__dirname, 'src/data/activities.json');

            // Execute Python sync script
            await execPromise('python3', [scriptPath]);

            // Read fresh data
            const rawData = fs.readFileSync(jsonPath, 'utf8');
            const parsed = JSON.parse(rawData);

            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify({
              success: true,
              count: parsed.length,
              timestamp: new Date().toISOString(),
              data: parsed
            }));
          } catch (err) {
            console.error('Sync error:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: false,
              error: err.message || 'Gagal menyinkronkan data'
            }));
          }
        });

        server.middlewares.use('/api/sync-berita', async (req, res) => {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

          if (req.method === 'OPTIONS') {
            res.statusCode = 200;
            res.end();
            return;
          }

          try {
            const scriptPath = path.resolve(__dirname, 'scripts/sync_berita.py');
            const jsonPath = path.resolve(__dirname, 'src/data/news.json');

            // Execute Python sync script
            await execPromise('python3', [scriptPath]);

            // Read fresh data
            const rawData = fs.readFileSync(jsonPath, 'utf8');
            const parsed = JSON.parse(rawData);

            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify({
              success: true,
              count: parsed.length,
              timestamp: new Date().toISOString(),
              data: parsed
            }));
          } catch (err) {
            console.error('Sync berita error:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: false,
              error: err.message || 'Gagal menyinkronkan data berita'
            }));
          }
        });
      }
    }
  ],
  server: {
    port: 3000,
    open: false,
    host: '0.0.0.0',
    watch: {
      ignored: ['**/src/data/**', '**/scripts/**', '**/.tmp/**', '**/tmp/**']
    }
  }
});
