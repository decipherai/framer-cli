export const SKILL_TEMPLATE = `---
name: framer-cli
description: >-
  Manages a Framer website through the local framer-cli command and the Framer Server API.
  Use when inspecting the Framer project, listing collections and fields, reading or updating CMS items,
  creating or editing blog posts, formatting blog content, generating blog thumbnail images as SVG and
  rasterizing them to PNG, setting image fields, checking publish or deployment information, or
  scaffolding the Framer skill into a repository.
---

<!-- skill-version: {{FRAMER_CLI_VERSION}} -->

# /framer-cli — Framer CLI Agent

## Version Check (run once per session)

Before doing anything else:

1. Read the skill version from the \`<!-- skill-version: ... -->\` comment above.
2. Try \`framer-cli -v\` to get the installed CLI version.
3. If \`framer-cli\` is not available, try \`node dist/index.js -v\`.
4. If the built CLI is missing, run \`npm run build\`.
5. Read \`package.json\` to get the package version in this repo.
6. If the skill version does not match the current CLI/package version, run:
   \`\`\`bash
   node dist/index.js init --force
   \`\`\`
   Then tell the user to re-invoke \`/framer-cli\` and stop.
7. Do not repeat this check again in the same conversation.

## CLI Resolution

Resolve the CLI in this order:

1. \`framer-cli\`
2. \`node dist/index.js\`
3. \`npx framer-cli\`

In this repository, prefer \`node dist/index.js\` once it exists. It is the most reliable path for local \`.env\` loading.

The CLI auto-loads \`.env\` from the current working directory. It expects:

- \`FRAMER_API_KEY\`
- \`FRAMER_PROJECT_URL\` or \`FRAMER_PROJECT_ID\`

## Agent Ergonomics

Every CLI invocation may include \`--note "<why this command is running>"\`.

- The CLI accepts \`--note\` anywhere in the command line and ignores it after parsing.
- Use it on agent-driven commands for consistent observability.
- Keep the note to one sentence.

## Routing

Route based on the first word(s) of \`$ARGUMENTS\`:

- **\`blog\`**, **\`post\`**, **\`create-post\`**, **\`edit-post\`**, **\`update-post\`** → Read \`blog.md\` in this skill directory and follow it.
- **\`cms\`** → Read \`blog.md\` in this skill directory and follow the generic CMS sections.
- **\`content\`**, **\`format\`**, **\`markdown\`**, **\`html\`**, **\`image\`**, **\`images\`**, **\`thumbnail\`**, **\`generate-image\`** → Read \`content.md\` in this skill directory and follow it.
- **\`publish\`**, **\`deploy\`**, **\`project\`**, **\`methods\`**, **\`cli\`** → Read \`cli.md\` in this skill directory and follow it.
- **Natural language blog/CMS requests** → Treat as \`blog\`. Read \`blog.md\` and follow it.
- **Natural language formatting requests** → Treat as \`content\`. Read \`content.md\` and follow it.
- **Empty or unrecognized** → Show the available commands:
  - \`/framer-cli blog\` — Create, inspect, update, or remove blog posts
  - \`/framer-cli cms\` — Work with generic CMS collections and items
  - \`/framer-cli content\` — Formatting, markdown, HTML, image, and field-data guidance
  - \`/framer-cli publish\` — Inspect publish/deploy state and perform publish/deploy actions
  - \`/framer-cli cli\` — CLI command reference and troubleshooting

## Important Rules

- Prefer the dedicated \`blog\` and \`cms\` commands over ad-hoc Node snippets.
- Include \`--note\` on agent-driven CLI calls.
- Pass \`--allow-write\` on any command that mutates Framer state.
- Default new content to \`draft: true\` unless the user explicitly asks to publish it.
- For blog thumbnails, prefer generating a new topical SVG at 1200x630 and rasterizing it to PNG with \`sips\` instead of reusing a generic external image.
- Keep generated thumbnails simple: one short headline, at most one short supporting line, minimal decoration, and wide safe margins so text never crowds the edges.
- Use \`blog fields\` or \`cms fields <collection>\` to confirm the current schema when in doubt.
- Do not rely on \`call getAgentSystemPrompt\`, \`call getAgentContext\`, \`call readProjectForAgent\`, or \`call applyAgentChanges\` unless you first verify access. In this project those methods may fail with \`This method is only available to Framer employees\`.
`;
