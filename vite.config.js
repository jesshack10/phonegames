import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// El nombre de los assets ya lleva hash, así que lo único que se queda pegado
// en el navegador es index.html. Este sello deja comprobar de un vistazo si dos
// teléfonos están corriendo la misma versión.
const BUILD_ID = (process.env.GITHUB_SHA || 'local').slice(0, 7)
const BUILD_AT = new Date().toISOString().slice(0, 16).replace('T', ' ')

export default defineConfig({
  plugins: [react()],
  base: '/',
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
    __BUILD_AT__: JSON.stringify(BUILD_AT),
  },
})
