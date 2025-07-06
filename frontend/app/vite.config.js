import path from "path" // Import the path module
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  esbuild: false, // Disable esbuild
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext'
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"), // Define the @/* alias
    },
  },
  server: {
    host: '0.0.0.0', // Allow external connections
    port: 5173,      // Specify port (optional)
    fs: {
      strict: false,
    },
  },
})
