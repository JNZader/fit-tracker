import { defineConfig } from "vite"
import { resolve } from "path"

export default defineConfig({
  resolve: {
    alias: {
      "@core": resolve(__dirname, "src/core"),
      "@modules": resolve(__dirname, "src/modules"),
      "@styles": resolve(__dirname, "src/styles"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          chartjs: ["chart.js"],
          zod: ["zod"],
        },
      },
    },
  },
})
