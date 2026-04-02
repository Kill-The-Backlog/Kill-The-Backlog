import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
// import { defineRdtConfig, reactRouterDevTools } from "react-router-devtools";
import { defineConfig } from "vite";
import { envOnlyMacros } from "vite-env-only";
import svgr from "vite-plugin-svgr";

export default defineConfig(({ isSsrBuild }) => ({
  ...(isSsrBuild
    ? {
        build: {
          rollupOptions: {
            input: "./server/app.ts",
          },
        },
      }
    : undefined),
  plugins: [
    // Seems to slow things down a bit. Enable when needed:
    // reactRouterDevTools(
    //   defineRdtConfig({
    //     server: {
    //       silent: true,
    //     },
    //     tanstackConfig: {
    //       inspectHotkey: ["Control", "Shift"],
    //       openHotkey: ["Control", "o"],
    //       triggerHidden: true,
    //     },
    //   }),
    // ),
    reactRouter(),
    envOnlyMacros(),
    svgr(),
    tailwindcss(),
  ],
}));
