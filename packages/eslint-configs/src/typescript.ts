import tsEslint from "typescript-eslint";
import importPlugin from "eslint-plugin-import";

export default function typescriptConfig(
  tsConfigs: string[] = ["tsconfig.json"],
) {
  return tsEslint.config(
    {
      languageOptions: {
        parserOptions: {
          project: tsConfigs,
        },
      },
    },
    tsEslint.configs.strictTypeChecked,
    tsEslint.configs.stylisticTypeChecked,
    importPlugin.flatConfigs.typescript,
    {
      rules: {
        "@typescript-eslint/dot-notation": "error",
        // Disable the base rule as it can report incorrect errors with
        // `@typescript-eslint/dot-notation`.
        "dot-notation": "off",

        // This is already enforced by setting "verbatimModuleSyntax" to true in
        // tsconfig.json, but enabling allows us to fix with `eslint --fix`.
        "@typescript-eslint/consistent-type-imports": "error",
        "import/consistent-type-specifier-style": "error",

        "@typescript-eslint/no-unused-vars": "off", // Already checked by TS compiler
        "@typescript-eslint/no-restricted-types": [
          "error",
          {
            types: {
              "React.FC":
                "Useless and has some drawbacks, see https://github.com/facebook/create-react-app/pull/8177",
              "React.FunctionalComponent":
                "Preact specific, useless and has some drawbacks, see https://github.com/facebook/create-react-app/pull/8177",
              "React.FunctionComponent":
                "Useless and has some drawbacks, see https://github.com/facebook/create-react-app/pull/8177",
            },
          },
        ],
        "@typescript-eslint/restrict-template-expressions": [
          "error",
          {
            allowAny: false,
            allowArray: false,
            allowBoolean: false,
            allowNever: false,
            allowNullish: true, // Sometimes useful
            allowNumber: true,
            allowRegExp: false,
          },
        ],
        "@typescript-eslint/switch-exhaustiveness-check": [
          "error",
          {
            considerDefaultExhaustiveForUnions: true,
          },
        ],
        "@typescript-eslint/no-non-null-assertion": "off", // Allow `!`
        "@typescript-eslint/consistent-type-definitions": ["error", "type"], // Prefer `type`
        "@typescript-eslint/no-dynamic-delete": "off", // Allow `delete object[path]`
        "@typescript-eslint/only-throw-error": "off", // Allow throwing non-Error (e.g., Remix responses)
        "@typescript-eslint/unbound-method": "off",
        "@typescript-eslint/prefer-regexp-exec": "off",
        "@typescript-eslint/require-await": "off",
      },
    },
  );
}
