# `framer-cli`

Thin CLI wrapper around the Framer Server API for shell-driven agents and automation.

It has two jobs:

- provide a small agent-friendly CLI for Framer project and CMS operations
- scaffold a Claude skill under `.claude/skills/framer/`

## Requirements

- Node 22+
- A Framer Server API key for the target project
- A Framer project URL or project ID

The Node 22 requirement comes from Framer's official `framer-api` package.

## Configuration

The CLI reads configuration in this order:

1. Command-line flags
2. Environment variables
3. A `.env` file in the current working directory

Supported variables:

- `FRAMER_API_KEY`
- `FRAMER_PROJECT_URL`
- `FRAMER_PROJECT_ID`

Example `.env`:

```dotenv
FRAMER_PROJECT_URL="https://framer.com/projects/Your-Project--abc123"
FRAMER_API_KEY="your_api_key"
```

## Install

```bash
npm install
npm run build
```

## Skill Setup

Generate the Claude skill files and permissions:

```bash
node dist/index.js init
node dist/index.js init --force
```

This writes:

- `.claude/skills/framer/SKILL.md`
- `.claude/skills/framer/cli.md`
- `.claude/skills/framer/blog.md`
- `.claude/skills/framer/content.md`

It also adds the required CLI permissions to `.claude/settings.json`.

## Use As A Skill

The CLI binary is still `framer-cli`, but the installed Claude skill name is `framer`.

That means the normal flow is:

```bash
npm install
npm run build
node dist/index.js init
```

After that, invoke the skill as:

```text
/framer
/framer blog
/framer publish
```

If you re-run setup and want to overwrite the existing skill files, use:

```bash
node dist/index.js init --force
```

## How To Run

Preferred invocation order:

1. `framer-cli ...`
2. `node dist/index.js ...`
3. `npx framer-cli ...`

Examples:

```bash
node dist/index.js methods
node dist/index.js blog fields
```

## Agent Ergonomics

The CLI accepts `--note "<short reason>"` on every command and ignores it after parsing.

Examples:

```bash
node dist/index.js blog list --limit 10 --note "Checking recent posts before creating a draft"
node dist/index.js blog upsert --item-file post.json --allow-write --note "Creating the requested draft post"
```

## Commands

### `methods`

List the supported low-level Framer method wrappers.

```bash
node dist/index.js methods
```

### `call <method>`

Invoke one of the supported low-level Framer methods.

```bash
node dist/index.js call getProjectInfo
node dist/index.js call getPublishInfo
node dist/index.js call deploy --args '["deployment_id",["example.com"]]' --allow-write
```

### `cms ...`

Generic CMS collection and item commands.

```bash
node dist/index.js cms collections
node dist/index.js cms fields Blog
node dist/index.js cms items Blog --limit 20
node dist/index.js cms get-item Blog --slug "my-post"
node dist/index.js cms upsert-item Blog --item-file post.json --allow-write
node dist/index.js cms remove-item Blog --slug "old-post" --allow-write
```

### `blog ...`

Convenience wrappers for the current `Blog` collection.

```bash
node dist/index.js blog fields
node dist/index.js blog list --limit 20
node dist/index.js blog get --slug "my-post"
node dist/index.js blog upsert --item-file post.json --allow-write
node dist/index.js blog remove --slug "old-post" --allow-write
```

`blog upsert` and `cms upsert-item` behave as real upserts:

- if the payload includes an existing `id`, the CLI updates that item
- otherwise, if the payload slug matches an existing item, the CLI updates by slug
- otherwise, the CLI creates a new item
- on updates, the CLI preserves the current draft state unless you explicitly change it
- on id-based updates, the CLI preserves the current slug unless you explicitly change it

## Passing Input

### `call`

`call` expects a JSON array of method arguments.

Inline JSON:

```bash
node dist/index.js call getChangeContributors --args '[1,5]'
```

From a file:

```bash
node dist/index.js call deploy --args-file deploy-args.json --allow-write
```

From stdin:

```bash
printf '%s\n' '["deployment_id",["example.com"]]' | \
  node dist/index.js call deploy --args-file - --allow-write
```

### `cms upsert-item` and `blog upsert`

These expect a single JSON object.

Payload shape:

```json
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
```

You can pass it with:

- `--item '<json>'`
- `--item-file /path/to/file.json`
- `--item-file -` to read from stdin

## Blog Content Notes

The current Framer `Blog` collection uses these field ids:

- `Pfx5_b5ap` — title
- `qTKsMl_6r` — category enum
- `OlVYsaJ0N` — author profile image
- `vbshpsmrv` — author
- `V1tA1xhKv` — author job title
- `i9ezyRZxC` — date
- `k1F9wAHMm` — thumbnail
- `dBE2k2jxM` — formatted content

Important write rules:

- Formatted text should use `contentType: "markdown"` if you want Markdown syntax like `**bold**`
- Use `contentType: "html"` if you are writing raw tags like `<strong>`
- Enum fields require the enum case id when writing, not the label
- Image fields accept a URL string when writing
- When reading an existing item, image fields typically come back as objects, so reuse `fieldData.<fieldId>.value.url`

## Output

- Results are emitted as JSON by default
- Use `--pretty` for formatted JSON
- Use `--raw` only for methods that truly return strings
- Errors are emitted to stderr as JSON

## Known Limitation

These low-level methods exist in the Framer SDK but may fail in this project with `This method is only available to Framer employees`:

- `getAgentSystemPrompt`
- `getAgentContext`
- `readProjectForAgent`
- `applyAgentChanges`

When that happens, use the project and CMS commands instead.

## Troubleshooting

- `Missing API key` means `FRAMER_API_KEY` was not provided by flag, env var, or `.env`.
- `Missing project` means `FRAMER_PROJECT_URL` or `FRAMER_PROJECT_ID` was not provided.
- `Collection item not found for selector ...` means the requested id or slug does not exist in that collection; use `blog list` or `cms items <collection>` to find the correct item first.
- `--allow-write` errors mean the command is mutating state and must be re-run with explicit write approval.
