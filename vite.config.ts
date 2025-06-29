import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/inventory-app/',
  // appType: 'spa', // Enables history fallback for SPAs
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  }
})
