import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Important pour les chemins relatifs
  clearScreen: false,
  server: {
    port: 3000,
    strictPort: true,
    host: true,
    watch: {
      ignored: ["**/node_modules/**", "**/dist/**", "**/notes.db"],
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsDir: 'assets',
    // Assurez-vous que l'entrée pointe vers le bon fichier
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
    },
  }
});
