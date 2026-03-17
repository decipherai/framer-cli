export const CLI_TEMPLATE = `# CLI — Decipher Framer Command Reference

This is the command reference for the \`decipher-framer\` CLI.

## Preferred Invocation Order

Use commands in this order:

1. \`decipher-framer ...\`
2. \`node framer-api-cli/dist/index.js ...\`
3. \`npm exec --workspace @decipher-sdk/framer-api-cli decipher-framer ...\`

In this repository, prefer \`node framer-api-cli/dist/index.js ...\` after the CLI has been built.

## Build

If the built CLI is missing, run:

\`\`\`bash
npm run build --workspace @decipher-sdk/framer-api-cli
\`\`\`

## Configuration

The CLI reads configuration in this order:

1. Explicit flags
2. Environment variables
3. \`.env\` in the current working directory

Required values:

- \`FRAMER_API_KEY\`
- \`FRAMER_PROJECT_URL\` or \`FRAMER_PROJECT_ID\`

## Global Flag: \`--note\`

For parity with \`decipher-qa\`, every command may include \`--note "<short reason>"\`.

- The Framer CLI accepts \`--note\` for agent ergonomics and ignores it after parsing.
- Keep notes to one sentence.
- Example:

\`\`\`bash
decipher-framer blog list --limit 20 --note "Checking recent posts before creating a new draft"
\`\`\`

## Top-Level Commands

### \`decipher-framer init\`

Scaffold the Framer skill into the nearest git repository.

\`\`\`bash
decipher-framer init
decipher-framer init --force
\`\`\`

### \`decipher-framer methods\`

List the supported low-level \`call\` methods.

\`\`\`bash
decipher-framer methods
\`\`\`

### \`decipher-framer call <method>\`

Invoke the supported Framer Server API methods that are directly wrapped by the CLI.

\`\`\`bash
decipher-framer call getProjectInfo
decipher-framer call getPublishInfo
decipher-framer call getDeployments
decipher-framer call getChangedPaths
decipher-framer call getChangeContributors --args '[1,5]'
decipher-framer call publish --allow-write
decipher-framer call deploy --args '["deployment_id",["example.com"]]' --allow-write
\`\`\`

Use \`--raw\` only for string-returning methods.

### \`decipher-framer cms ...\`

Generic CMS commands.

\`\`\`bash
decipher-framer cms collections
decipher-framer cms fields Blog
decipher-framer cms items Blog --limit 20
decipher-framer cms get-item Blog --slug "my-post"
decipher-framer cms upsert-item Blog --item-file post.json --allow-write
decipher-framer cms remove-item Blog --slug "old-post" --allow-write
\`\`\`

### \`decipher-framer blog ...\`

Convenience wrappers around the current \`Blog\` collection.

\`\`\`bash
decipher-framer blog fields
decipher-framer blog list --limit 20
decipher-framer blog get --slug "my-post"
decipher-framer blog upsert --item-file post.json --allow-write
decipher-framer blog remove --slug "old-post" --allow-write
\`\`\`

\`blog upsert\` and \`cms upsert-item\` behave as true upserts:

- if the payload includes an existing \`id\`, the CLI updates that item
- otherwise, if the payload slug matches an existing item, the CLI updates that item by slug
- otherwise, the CLI creates a new item
- when updating, the CLI preserves the current draft state unless you explicitly set \`draft\` or pass \`--draft\` / \`--published\`
- when updating by \`id\`, the CLI preserves the current slug unless you explicitly change it

## Generic Output Rules

- JSON is the default output format.
- Use \`--pretty\` to format JSON.
- Errors are emitted as JSON on stderr.

## CMS Input Rules

\`cms upsert-item\` and \`blog upsert\` expect a single JSON object as the item payload.

You can provide it using:

- \`--item '<json>'\`
- \`--item-file /path/to/file.json\`
- \`--item-file -\` to read from stdin

Item payload shape:

\`\`\`json
{
  "id": "optional-existing-item-id",
  "slug": "required-for-new-items",
  "draft": true,
  "fieldData": {
    "FIELD_ID": {
      "type": "string",
      "value": "Example"
    }
  }
}
\`\`\`

## Current Known Limitation

The following low-level methods may be unavailable in this project even though they exist in the package type definitions:

- \`getAgentSystemPrompt\`
- \`getAgentContext\`
- \`readProjectForAgent\`
- \`applyAgentChanges\`

If the API returns \`This method is only available to Framer employees\`, stop relying on those methods for the current task and use the CMS/project methods instead.

## Troubleshooting

- \`Missing API key\` → Set \`FRAMER_API_KEY\` or add it to \`.env\`.
- \`Missing project\` → Set \`FRAMER_PROJECT_URL\` or \`FRAMER_PROJECT_ID\`.
- \`Collection "<x>" not found\` → Run \`decipher-framer cms collections\` first and use the exact id or name.
- \`Collection item not found for selector ...\` → Re-check the item id or slug with \`blog list\` or \`cms items <collection>\`.
- \`Provide exactly one of --id or --slug\` → Narrow the target item selector.
- \`--allow-write\` required → Re-run the mutating command with \`--allow-write\`.
- \`Expected a valid enum case\` → Use the enum case ID when writing, not the human label.
`;
