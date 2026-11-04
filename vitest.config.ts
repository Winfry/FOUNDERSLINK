import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // React Native's bundler normally provides this global; expo modules read it.
  define: { __DEV__: "false" },
  resolve: {
    alias: {
      // react-native ships Flow source that Node cannot load; the journey
      // tests only exercise mock services, so a tiny stub stands in for it.
      "react-native": fileURLToPath(new URL("./mobile/src/__tests__/react-native.stub.ts", import.meta.url)),
      "expo-secure-store": fileURLToPath(new URL("./mobile/src/__tests__/expo.stub.ts", import.meta.url)),
      "expo-document-picker": fileURLToPath(new URL("./mobile/src/__tests__/expo.stub.ts", import.meta.url)),
    },
  },
  test: {
    include: ["shared/__tests__/**/*.test.ts", "mobile/src/__tests__/**/*.test.ts"],
  },
});
