import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
  define: {
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },
})
