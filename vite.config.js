import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/storia-romana/', // Cambia questo in '/' se il repository è alla root di GitHub Pages
})

