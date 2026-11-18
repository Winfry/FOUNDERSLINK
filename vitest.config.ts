import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // The app's bundler turns an image into a number it can draw; here any
  // image a module requires is a placeholder, so code that shows photos
  // (the demo's portraits) can be tested.
  plugins: [{ name: "images", enforce: "pre", load: (id: string) => (/\.(jpe?g|png)$/i.test(id) ? "export default 1;" : undefined) }],
  // React Native's bundler normally provides this global; expo modules read it.
  define: { __DEV__: "false" },
  resolve: {
    alias: {
      // react-native ships Flow source that Node cannot load; the journey
      // tests only exercise mock services, so a tiny stub stands in for it.
      "react-native": fileURLToPath(new URL("./mobile/src/__tests__/react-native.stub.ts", import.meta.url)),
      "expo-secure-store": fileURLToPath(new URL("./mobile/src/__tests__/expo.stub.ts", import.meta.url)),
      "expo-document-picker": fileURLToPath(new URL("./mobile/src/__tests__/expo.stub.ts", import.meta.url)),
      "lucide-react-native": fileURLToPath(new URL("./mobile/src/__tests__/icons.stub.ts", import.meta.url)),
      // The code the apps share, as the mobile bundler resolves it.
      "@shared": fileURLToPath(new URL("./shared", import.meta.url)),
    },
  },
  test: {
    include: ["shared/__tests__/**/*.test.ts", "mobile/src/__tests__/**/*.test.ts"],
  },
});
