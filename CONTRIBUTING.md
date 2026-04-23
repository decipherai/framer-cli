# Contributing

Thanks for taking the time to improve `framer-cli`.

## Development Setup

```bash
npm install
npm run check-types
npm run build
```

The project uses TypeScript and native ES modules. Source files live in `src/`; compiled output is written to `dist/`.

## Local Testing

Use a local `.env` file for Framer credentials:

```bash
cp .env.example .env
```

Then fill in your own Framer API key and project value. Do not commit `.env`.

Smoke-test the CLI:

```bash
node dist/index.js --help
node dist/index.js methods --pretty
node dist/index.js cms collections --pretty
```

Mutating commands require `--allow-write`. Please verify read commands first and use drafts for CMS content until you intentionally publish.

## Pull Requests

- Keep changes focused.
- Run `npm run check-types` and `npm run build`.
- Update `README.md` when user-facing behavior changes.
- Avoid committing generated local files, `.env`, or temporary Framer payloads.
