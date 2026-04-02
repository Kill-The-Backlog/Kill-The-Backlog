import baseConfig from "@ktb/eslint-configs/base";
import reactConfig from "@ktb/eslint-configs/react";
import typescriptConfig from "@ktb/eslint-configs/typescript";

export default [
  ...baseConfig,
  ...typescriptConfig({
    project: ["tsconfig.json", "tsconfig.node.json"],
    tsconfigRootDir: import.meta.dirname,
  }),
  ...reactConfig,
  {
    rules: {
      "react-hooks/refs": "off",
    },
  },
  {
    ignores: [".react-router"],
  },
];
