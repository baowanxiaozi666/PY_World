import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('react-syntax-highlighter')) return 'highlight';
          if (id.includes('react-markdown') || id.includes('remark-gfm') || id.includes('rehype-raw')) return 'markdown';
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) return 'vendor';
        }
      }
    }
  },
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      }
    }
  },
  define: {
    // 防止在浏览器环境中访问 process 对象
    'process.env': '{}',
    'process': 'undefined',
  }
});