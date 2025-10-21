/**
 * Restrict stylelint to actual stylesheet files and ignore code files
 */
module.exports = {
  ignoreFiles: [
    "**/*.ts",
    "**/*.tsx",
    "**/*.js",
    "**/*.jsx",
    "**/*.mjs",
    "**/*.cjs",
    "**/*.json",
    "**/*.md",
    "**/*.mdx",
    "node_modules/**",
    "dist/**",
  ],
};
