import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Bibliotecas grandes ficam em arquivos próprios: mudam pouco,
// então o navegador mantém em cache entre uma versão e outra do sistema.
function vendorChunk(id) {
  if (!id.includes('node_modules')) return undefined
  if (id.includes('pdf-lib') || id.includes('@pdf-lib') || id.includes('pako')) return 'vendor-pdf'
  if (id.includes('@supabase')) return 'vendor-supabase'
  if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) return 'vendor-react'
  if (id.includes('lucide-react')) return 'vendor-icons'
  return undefined
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION_DATE__: JSON.stringify(new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }))
  },
  build: {
    target: 'es2020',
    rolldownOptions: {
      output: {
        manualChunks: vendorChunk,
      },
    },
  },
})
