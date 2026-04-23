# framer-cli

`framer-cli` is an agent-friendly command line wrapper around Framer's Server API. It gives shell scripts, AI coding agents, and local automation a predictable JSON interface for inspecting Framer projects, reading and writing CMS content, and triggering publish or deploy operations.

> `framer-cli` is an unofficial community tool. It is not affiliated with, endorsed by, or supported by Framer or the Framer team.

The package also includes an optional Claude skill scaffold. Running `framer-cli init` writes a `/framer` skill into a repository so Claude can use the CLI with focused guidance for Framer CMS and blog workflows.

## What It Does

- Lists Framer project metadata, publish state, deployments, and changed paths.
- Reads Framer CMS collections, fields, and items.
- Creates, updates, or removes CMS items with explicit `--allow-write` confirmation.
- Provides convenience commands for projects with a `Blog` collection.
- Accepts JSON from flags, files, or stdin for repeatable automation.
- Emits JSON output and JSON errors so agents can parse results safely.
- Scaffolds a Claude skill under `.claude/skills/framer/`.

## Requirements

- Node.js 22 or newer.
- A Framer Server API key.
- A Framer project URL or project ID.

The Node.js 22 requirement comes from Framer's official `framer-api` package.

## Install From Source

```bash
git clone https://github.com/decipherai/framer-cli.git
cd framer-cli
npm install
npm run build
```

Run the local build:

```bash
node dist/index.js --help
node dist/index.js methods --pretty
```

For local development, you can also link the binary:

```bash
npm link
framer-cli --help
```

## Configuration

The CLI reads configuration in this order:

1. Command-line flags.
2. Environment variables.
3. A `.env` file in the current working directory.

Supported values:

```dotenv
FRAMER_API_KEY="your_framer_server_api_key"
FRAMER_PROJECT_URL="https://framer.com/projects/Your-Project--abc123"
# or:
FRAMER_PROJECT_ID="abc123"
```

You can copy `.env.example` to `.env` and fill in your own values. Keep `.env` out of git.

## Quick Start

Inspect a project:

```bash
framer-cli call getProjectInfo --pretty
framer-cli call getPublishInfo --pretty
framer-cli cms collections --pretty
```

Inspect a CMS collection:

```bash
framer-cli cms fields Blog --pretty
framer-cli cms items Blog --limit 10 --pretty
```

Create or update a CMS item from a file:

```bash
framer-cli cms upsert-item Blog --item-file examples/blog-post.json --allow-write --pretty
```

Publish only when you intend to mutate the live project:

```bash
framer-cli call publish --allow-write --pretty
```

## Safety Model

Read commands run without extra confirmation. Mutating commands require `--allow-write`.

Commands that require `--allow-write` include:

- `framer-cli call applyAgentChanges`
- `framer-cli call publish`
- `framer-cli call deploy`
- `framer-cli cms upsert-item`
- `framer-cli cms remove-item`
- `framer-cli blog upsert`
- `framer-cli blog remove`

This makes it harder for an agent or script to accidentally change a project while it is still gathering context.

## Command Reference

### `methods`

List the low-level Framer method wrappers supported by this CLI.

```bash
framer-cli methods --pretty
```

### `call <method>`

Invoke a supported low-level Framer method.

```bash
framer-cli call getProjectInfo --pretty
framer-cli call getDeployments --pretty
framer-cli call getChangeContributors --args '[1,5]' --pretty
framer-cli call deploy --args '["deployment_id",["example.com"]]' --allow-write --pretty
```

`call` expects method arguments as a JSON array. You can pass the array inline, from a file, or through stdin:

```bash
framer-cli call deploy --args-file deploy-args.json --allow-write

printf '%s\n' '["deployment_id",["example.com"]]' | \
  framer-cli call deploy --args-file - --allow-write
```

### `cms ...`

Generic CMS collection and item commands.

```bash
framer-cli cms collections --pretty
framer-cli cms fields Blog --pretty
framer-cli cms items Blog --limit 20 --pretty
framer-cli cms get-item Blog --slug "my-post" --pretty
framer-cli cms upsert-item Blog --item-file post.json --allow-write --pretty
framer-cli cms remove-item Blog --slug "old-post" --allow-write --pretty
```

### `blog ...`

Convenience commands for projects that use a `Blog` collection.

```bash
framer-cli blog fields --pretty
framer-cli blog list --limit 20 --pretty
framer-cli blog get --slug "my-post" --pretty
framer-cli blog upsert --item-file post.json --allow-write --pretty
framer-cli blog remove --slug "old-post" --allow-write --pretty
```

`blog upsert` and `cms upsert-item` behave as upserts:

- If the payload includes an existing `id`, the CLI updates that item.
- Otherwise, if the payload slug matches an existing item, the CLI updates by slug.
- Otherwise, the CLI creates a new item.
- On updates, the CLI preserves the current draft state unless you explicitly set `draft` or pass `--draft` / `--published`.
- On id-based updates, the CLI preserves the current slug unless you explicitly change it.

### `init`

Scaffold the Claude skill into the nearest git repository.

```bash
framer-cli init
framer-cli init --force
```

This writes:

- `.claude/skills/framer/SKILL.md`
- `.claude/skills/framer/cli.md`
- `.claude/skills/framer/blog.md`
- `.claude/skills/framer/content.md`

It also adds the required CLI permissions to `.claude/settings.json`.

After setup, use the skill in Claude with:

```text
/framer
/framer blog create a draft post about our launch
/framer publish
```

## CMS Item Payloads

`cms upsert-item` and `blog upsert` expect a single JSON object:

```json
{
  "slug": "example-post",
  "draft": true,
  "fieldData": {
    "FIELD_ID": {
      "type": "string",
      "value": "Example value"
    }
  }
}
```

Use `framer-cli cms fields <collection>` before writing. Framer CMS writes use field IDs, not display labels, and enum fields require enum case IDs.

You can provide item payloads with:

- `--item '<json>'`
- `--item-file /path/to/file.json`
- `--item-file -` to read from stdin

## Development

```bash
npm install
npm run check-types
npm run build
npm pack --dry-run
```

The source lives in `src/`. The compiled package output goes to `dist/`.

## Troubleshooting

- `Missing API key`: set `FRAMER_API_KEY` or pass `--api-key`.
- `Missing project`: set `FRAMER_PROJECT_URL`, set `FRAMER_PROJECT_ID`, or pass `--project`.
- `Collection "<name>" not found`: run `framer-cli cms collections --pretty` and use the exact collection id or name.
- `Provide exactly one of --id or --slug`: narrow the item selector.
- `--allow-write required`: re-run the command with `--allow-write` once you intend to mutate the project.
- `Expected a valid enum case`: inspect fields and use the enum case ID, not the human label.

## License

MIT
