import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
const authPopupHeaders = {
  "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
};

export default defineConfig({
  plugins: [react()],
  server: { headers: authPopupHeaders },
  preview: { headers: authPopupHeaders },
})
