import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // The frontend imports Convex's generated API from the sibling backend
    // workspace. pnpm may install a second Convex copy there with different
    // optional peer dependencies, which would create a separate auth context.
    dedupe: ["convex", "react", "react-dom"],
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
