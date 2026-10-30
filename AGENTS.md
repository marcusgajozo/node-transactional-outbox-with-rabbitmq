# AGENTS.md

## No comments in code

Do not write comments in code. This applies to every `.ts` and `.js` file in the repository: line comments (`//`), block comments (`/* */`) and JSDoc (`/** */`).

- Names, types and small functions carry the intent instead.
- Explanations that do not fit the code belong in the pull request description, the commit message or `README.md`.
- A comment is allowed only when a tool needs it to work: `// @ts-expect-error`, `// @ts-ignore`, `// oxlint-disable-*`, `/* oxlint-disable */`, and shebangs. These are directives, not prose.

Existing comments must be deleted when a file is touched, and new ones must never be added.
