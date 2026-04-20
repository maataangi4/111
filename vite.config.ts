import path from 'node:path'
import { fileURLToPath } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

/** Carpeta donde está este archivo y los `.env*`. */
const projectRoot = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  const viteEnv = loadEnv(mode, projectRoot, 'VITE_')

  return {
    root: projectRoot,
    envDir: projectRoot,
    resolve: {
      alias: {
        '@': path.join(projectRoot, 'src'),
      },
    },
    /** Fuerza inyección en el bundle (por si el pre‑procesado estándar de import.meta.env falla en tu entorno). */
    define: {
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(viteEnv.VITE_GEMINI_API_KEY ?? ''),
      'import.meta.env.VITE_GEMINI_MODEL': JSON.stringify(viteEnv.VITE_GEMINI_MODEL ?? ''),
    },
    plugins: [react(), tailwindcss()],
  }
})
