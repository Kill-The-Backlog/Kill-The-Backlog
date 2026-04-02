import eslint from "@eslint/js";
import perfectionist from "eslint-plugin-perfectionist";
import tsEslint from "typescript-eslint";

export default tsEslint.config(
  eslint.configs.recommended,
  perfectionist.configs["recommended-natural"],
  {
    ignores: ["build"],
  },
  {
    rules: {
      "perfectionist/sort-imports": [
        "error",
        {
          groups: [
            "type-import",
            ["value-builtin", "value-external"],
            "type-internal",
            "value-internal",
            ["type-parent", "type-sibling", "type-index"],
            ["value-parent", "value-sibling", "value-index"],
            "ts-equals-import",
            "unknown",
          ],
          internalPattern: ["^#.*"],
          type: "natural",
        },
      ],
      "perfectionist/sort-object-types": [
        "error",
        {
          partitionByNewLine: true,
        },
      ],
      "perfectionist/sort-objects": [
        "error",
        {
          partitionByNewLine: true,
        },
      ],
      "arrow-body-style": ["error", "as-needed"],
    },
  },
);
