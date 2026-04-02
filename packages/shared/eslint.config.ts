import baseConfig from "@ktb/eslint-configs/base";
import typescriptConfig from "@ktb/eslint-configs/typescript";

export default [
  ...baseConfig,
  ...typescriptConfig(["tsconfig.json", "tsconfig.node.json"]),
  {
    ignores: ["src/generated"],
  },
];
