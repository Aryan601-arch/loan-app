import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Project pages on GitHub Pages are served from https://<user>.github.io/<repo>/
  base: "/loan-app/",
});
