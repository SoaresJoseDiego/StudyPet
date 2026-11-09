import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Em desenvolvimento, /api é encaminhado para a API .NET (dotnet run, perfil http).
// Assim o front e a API ficam na mesma origem e não é preciso configurar CORS.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5278',
    },
  },
})
