import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";

// https://vite.dev/config/
export default defineConfig({
  base: "/admin-portal/",
  server: {
    host: "0.0.0.0", // ✅ allows external access
    port: 5174, // or any other
    // rewrite all requests to index.html for SPA routing
    fs: {
      allow: ["./"],
    },
  },
  plugins: [
    react(),
    svgr({
      svgrOptions: {
        icon: true,
        // This will transform your SVG to a React component
        exportType: "named",
        namedExport: "ReactComponent",
      },
    }),
  ],
});
