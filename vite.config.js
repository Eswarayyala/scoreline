import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
const authPopupHeaders = {
  "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
};

const authProxy = {
  "/__/auth": {
    target: "https://scoreliner.firebaseapp.com",
    changeOrigin: true,
    secure: true,
  },
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { headers: authPopupHeaders, proxy: authProxy },
  preview: { headers: authPopupHeaders, proxy: authProxy },
})
