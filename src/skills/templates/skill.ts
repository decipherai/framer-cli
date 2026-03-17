export const SKILL_TEMPLATE = `---
name: decipher-framer
description: >-
  Manages the Decipher Framer website through the local decipher-framer CLI and the Framer Server API.
  Use when inspecting the Framer project, listing collections and fields, reading or updating CMS items,
  creating or editing blog posts, formatting blog content, setting image fields, checking publish or
  deployment information, or scaffolding the Framer skill into a repository.
---

<!-- skill-version: {{DECIPHER_FRAMER_VERSION}} -->

# /decipher-framer — Decipher Framer Agent

## Version Check (run once per session)

Before doing anything else:

1. Read the skill version from the \`<!-- skill-version: ... -->\` comment above.
2. Try \`decipher-framer -v\` to get the installed CLI version.
3. If \`decipher-framer\` is not available, try \`node framer-api-cli/dist/index.js -v\`.
4. If the built CLI is missing, run \`npm run build --workspace @decipher-sdk/framer-api-cli\`.
5. Read \`framer-api-cli/package.json\` to get the package version in this repo.
6. If the skill version does not match the current CLI/package version, run:
   \`\`\`bash
   node framer-api-cli/dist/index.js init --force
   \`\`\`
   Then tell the user to re-invoke \`/decipher-framer\` and stop.
7. Do not repeat this check again in the same conversation.

## CLI Resolution

Resolve the CLI in this order:

1. \`decipher-framer\`
2. \`node framer-api-cli/dist/index.js\`
3. \`npm exec --workspace @decipher-sdk/framer-api-cli decipher-framer\`

In this repository, prefer \`node framer-api-cli/dist/index.js\` once it exists. It is the most reliable path for local \`.env\` loading.

The CLI auto-loads \`.env\` from the current working directory. It expects:

- \`FRAMER_API_KEY\`
- \`FRAMER_PROJECT_URL\` or \`FRAMER_PROJECT_ID\`

## Agent Ergonomics

For parity with the Decipher QA skill, every CLI invocation may include \`--note "<why this command is running>"\`.

- The Framer CLI accepts \`--note\` anywhere in the command line and ignores it after parsing.
- Use it on agent-driven commands so the invocation style stays consistent with \`decipher-qa\`.
- Keep the note to one sentence.

## Routing

Route based on the first word(s) of \`$ARGUMENTS\`:

- **\`blog\`**, **\`post\`**, **\`create-post\`**, **\`edit-post\`**, **\`update-post\`** → Read \`blog.md\` in this skill directory and follow it.
- **\`cms\`** → Read \`blog.md\` in this skill directory and follow the generic CMS sections.
- **\`content\`**, **\`format\`**, **\`markdown\`**, **\`html\`**, **\`image\`**, **\`images\`**, **\`thumbnail\`** → Read \`content.md\` in this skill directory and follow it.
- **\`publish\`**, **\`deploy\`**, **\`project\`**, **\`methods\`**, **\`cli\`** → Read \`cli.md\` in this skill directory and follow it.
- **Natural language blog/CMS requests** (for example: "make a draft blog post", "edit the Framer blog", "update the thumbnail", "list CMS items") → Treat as \`blog\`. Read \`blog.md\` and follow it.
- **Natural language formatting requests** (for example: "make this text bold", "use markdown", "set an image", "how do I add a thumbnail") → Treat as \`content\`. Read \`content.md\` and follow it.
- **Empty or unrecognized** → Show the available commands:
  - \`/decipher-framer blog\` — Create, inspect, update, or remove blog posts
  - \`/decipher-framer cms\` — Work with generic CMS collections and items
  - \`/decipher-framer content\` — Formatting, markdown, HTML, image, and field-data guidance
  - \`/decipher-framer publish\` — Inspect publish/deploy state and perform publish/deploy actions
  - \`/decipher-framer cli\` — CLI command reference and troubleshooting

## Important Rules

- Prefer the dedicated \`blog\` and \`cms\` commands over ad-hoc Node snippets.
- Include \`--note\` on agent-driven CLI calls for the same operator ergonomics as \`decipher-qa\`.
- Pass \`--allow-write\` on any command that mutates Framer state.
- Default new content to \`draft: true\` unless the user explicitly asks to publish it.
- Use \`blog fields\` or \`cms fields <collection>\` to confirm the current schema when in doubt.
- Do not rely on \`call getAgentSystemPrompt\`, \`call getAgentContext\`, \`call readProjectForAgent\`, or \`call applyAgentChanges\` unless you first verify access. In this project those methods may fail with \`This method is only available to Framer employees\`.
`;
