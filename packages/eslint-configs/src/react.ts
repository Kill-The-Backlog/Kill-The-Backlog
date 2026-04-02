import reactHooks from "eslint-plugin-react-hooks";
import reactPlugin from "eslint-plugin-react";
import tsEslint from "typescript-eslint";

export default tsEslint.config(
  {
    ...reactPlugin.configs.flat["recommended"],
    settings: {
      react: {
        // https://github.com/vercel/next.js/issues/89764#issuecomment-3928272828
        version: "19",
      },
    },
  },
  {
    ...reactPlugin.configs.flat["jsx-runtime"],
  },
  reactHooks.configs.flat.recommended,
  {
    rules: {
      "react/prop-types": "off",
    },
  },
);
