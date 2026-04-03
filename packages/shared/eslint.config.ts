import baseConfig from "@ktb/eslint-configs/base";
import typescriptConfig from "@ktb/eslint-configs/typescript";

export default [
  ...baseConfig,
  ...typescriptConfig({
    project: ["tsconfig.json", "tsconfig.node.json"],
    tsconfigRootDir: import.meta.dirname,
  }),
  {
    ignores: ["src/generated"],
  },
];
