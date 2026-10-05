import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { spawn } from 'node:child_process';
function backend() {
  return { name: 'imphal-backend', configureServer(server) {
    const child = spawn(process.env.PYTHON || 'python3', ['server/app.py'], {stdio: 'inherit'});
    child.on('error', error => console.error('Backend failed:', error.message));
    server.httpServer?.once('close', () => child.kill());
    process.once('exit', () => child.kill());
  }};
}
export default defineConfig({
  build: { outDir: 'dist/client' },
  optimizeDeps: {include: ['react', 'react-dom/client']},
  server: { host: '0.0.0.0', allowedHosts: ['terminal.local'], proxy: {
    '/api': {target:'http://127.0.0.1:8788', changeOrigin:false},
    '/uploads': {target:'http://127.0.0.1:8788', changeOrigin:false}
  }}, plugins: [react(), backend()]
});
