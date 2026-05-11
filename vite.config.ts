import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { tanstackRouterVite } from "@tanstack/router-plugin/vite";
import { tanstackStartVite } from "@tanstack/react-start/plugin/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    tanstackRouterVite(),
    tsconfigPaths(),
    react(),
    tailwindcss(),
    tanstackStartVite(),
  ],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "recharts", "xlsx"],
        },
      },
    },
  },
});
