import { defineConfig } from 'vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import tailwindcss from '@tailwindcss/vite'
export default defineConfig({
    plugins: [
    basicSsl(),
    tailwindcss()
  ],
    server: {
        host: '0.0.0.0',
        port: 5173,
         https: true 
    }
})