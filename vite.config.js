import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { existsSync, copyFileSync, mkdirSync } from 'fs'

// Copies the install (PWA) files into the built site, whether they sit in the
// project root or in the public folder.
const PWA_FILES = ['manifest.json', 'sw.js', 'icon-192.png', 'icon-512.png']
const copyPwaFiles = () => ({
  name: 'copy-pwa-files',
  apply: 'build',
  closeBundle() {
    mkdirSync('dist', { recursive: true })
    for (const f of PWA_FILES) {
      if (existsSync(f)) copyFileSync(f, `dist/${f}`)
    }
  }
})

export default defineConfig({
  plugins: [react(), copyPwaFiles()],
  server: {
    port: 3000,
    host: '0.0.0.0'
  }
})
