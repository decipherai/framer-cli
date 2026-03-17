#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";
import { Command } from "commander";
import {
  connect,
  type Collection,
  type CollectionItem,
  type CollectionItemInput,
  type Field,
  type Framer,
} from "framer-api";
import {
  BLOG_TEMPLATE,
  CLI_TEMPLATE,
  CONTENT_TEMPLATE,
  SKILL_TEMPLATE,
} from "./skills/templates/index.js";

const CLI_NAME = "framer-cli";
const BLOG_COLLECTION_NAME = "Blog";
const require = createRequire(import.meta.url);
const packageJson = require("../package.json") as { version: string };

type SharedConnectionOptions = {
  project?: string;
  apiKey?: string;
  serverUrl?: string;
  pretty?: boolean;
};

type CallOptions = SharedConnectionOptions & {
  args?: string;
  argsFile?: string;
  allowWrite?: boolean;
  raw?: boolean;
};

type ItemInputOptions = SharedConnectionOptions & {
  item?: string;
  itemFile?: string;
  allowWrite?: boolean;
  draft?: boolean;
  published?: boolean;
};

type ItemSelectorOptions = SharedConnectionOptions & {
  id?: string;
  slug?: string;
  allowWrite?: boolean;
};

type CmsListOptions = SharedConnectionOptions & {
  limit?: string;
};

type InitOptions = {
  force?: boolean;
  gitCheck?: boolean;
};

type MethodDefinition = {
  summary: string;
  args: readonly string[];
  write?: boolean;
  invoke: (framer: Framer, args: unknown[]) => Promise<unknown>;
};

type CollectionField = Field;

type SkillFile = {
  relPath: string;
  content: string;
};

class CLIError extends Error {
  readonly exitCode: number;

  constructor(message: string, exitCode = 1) {
    super(message);
    this.name = "CLIError";
    this.exitCode = exitCode;
  }
}

// Extract --note <text> from argv before Commander parses, matching the QA CLI ergonomics.
let noteText: string | undefined;
const noteIndex = process.argv.indexOf("--note");
if (noteIndex !== -1) {
  if (noteIndex + 1 >= process.argv.length) {
    throw new CLIError("The --note flag requires a value.");
  }

  noteText = process.argv[noteIndex + 1];
  process.argv.splice(noteIndex, 2);
}
void noteText;

const SKILL_FILES: SkillFile[] = [
  {
    relPath: ".claude/skills/framer-cli/SKILL.md",
    content: SKILL_TEMPLATE,
  },
  {
    relPath: ".claude/skills/framer-cli/cli.md",
    content: CLI_TEMPLATE,
  },
  {
    relPath: ".claude/skills/framer-cli/blog.md",
    content: BLOG_TEMPLATE,
  },
  {
    relPath: ".claude/skills/framer-cli/content.md",
    content: CONTENT_TEMPLATE,
  },
];

const REQUIRED_PERMISSIONS = [
  "Bash(framer-cli:*)",
  "Bash(node dist/index.js:*)",
  "Bash(npx framer-cli:*)",
];

loadEnvFileIfPresent();

const METHOD_DEFINITIONS: Record<string, MethodDefinition> = {
  getProjectInfo: {
    summary: "Get project metadata such as project id and name.",
    args: [],
    invoke: async (framer, args) => {
      assertMaxArgs("getProjectInfo", args, 0);
      return framer.getProjectInfo();
    },
  },
  getPublishInfo: {
    summary: "Get staging and production publish metadata.",
    args: [],
    invoke: async (framer, args) => {
      assertMaxArgs("getPublishInfo", args, 0);
      return framer.getPublishInfo();
    },
  },
  getDeployments: {
    summary: "List available deployments for the current project.",
    args: [],
    invoke: async (framer, args) => {
      assertMaxArgs("getDeployments", args, 0);
      return framer.getDeployments();
    },
  },
  getChangedPaths: {
    summary: "Get changed file paths grouped by added, removed, and modified.",
    args: [],
    invoke: async (framer, args) => {
      assertMaxArgs("getChangedPaths", args, 0);
      return framer.getChangedPaths();
    },
  },
  getChangeContributors: {
    summary: "List contributors between two optional versions.",
    args: ["fromVersion?: number", "toVersion?: number"],
    invoke: async (framer, args) => {
      assertMaxArgs("getChangeContributors", args, 2);
      return framer.getChangeContributors(
        parseOptionalNumber(args[0], "getChangeContributors", "fromVersion"),
        parseOptionalNumber(args[1], "getChangeContributors", "toVersion")
      );
    },
  },
  getAgentSystemPrompt: {
    summary: "Return Framer's static agent prompt and command/query reference.",
    args: [],
    invoke: async (framer, args) => {
      assertMaxArgs("getAgentSystemPrompt", args, 0);
      return framer.getAgentSystemPrompt();
    },
  },
  getAgentContext: {
    summary: "Return project-specific agent context for the active page or a given page path.",
    args: ['options?: { "pagePath"?: string }'],
    invoke: async (framer, args) => {
      assertMaxArgs("getAgentContext", args, 1);
      return framer.getAgentContext(parseOptionalPageOptions(args[0], "getAgentContext"));
    },
  },
  readProjectForAgent: {
    summary: "Execute Framer agent queries and return one result per query.",
    args: ['queries: Record<string, unknown>[]', 'options?: { "pagePath"?: string }'],
    invoke: async (framer, args) => {
      assertMaxArgs("readProjectForAgent", args, 2);
      return framer.readProjectForAgent(
        parseQueryArray(args[0], "readProjectForAgent"),
        parseOptionalPageOptions(args[1], "readProjectForAgent")
      );
    },
  },
  applyAgentChanges: {
    summary: "Apply Framer agent DSL commands to a page.",
    args: ['dsl: string', 'options?: { "pagePath"?: string }'],
    write: true,
    invoke: async (framer, args) => {
      assertMaxArgs("applyAgentChanges", args, 2);
      return framer.applyAgentChanges(
        parseRequiredString(args[0], "applyAgentChanges", "dsl"),
        parseOptionalPageOptions(args[1], "applyAgentChanges")
      );
    },
  },
  publish: {
    summary: "Create a new publish result for the project.",
    args: [],
    write: true,
    invoke: async (framer, args) => {
      assertMaxArgs("publish", args, 0);
      return framer.publish();
    },
  },
  deploy: {
    summary: "Deploy a deployment id, optionally constrained to domains.",
    args: ["deploymentId: string", "domains?: string[]"],
    write: true,
    invoke: async (framer, args) => {
      assertMaxArgs("deploy", args, 2);
      return framer.deploy(
        parseRequiredString(args[0], "deploy", "deploymentId"),
        parseOptionalStringArray(args[1], "deploy", "domains")
      );
    },
  },
};

const program = new Command();

program
  .name(CLI_NAME)
  .description("Thin CLI wrapper around the Framer Server API")
  .version(packageJson.version, "-v, --version")
  .showHelpAfterError("(run with --help for usage)");

program
  .command("init")
  .description("Scaffold framer-cli skill files into the nearest git repository")
  .option("-f, --force", "Overwrite existing skill files", false)
  .option("--no-git-check", "Use the current directory instead of searching for a git root")
  .action(async (options: InitOptions) => {
    const rootDir = resolveRootDir(options);
    const written: string[] = [];
    const skipped: string[] = [];

    for (const file of SKILL_FILES) {
      const absPath = path.join(rootDir, file.relPath);
      const exists = existsSync(absPath);

      if (exists && !options.force) {
        skipped.push(file.relPath);
        continue;
      }

      mkdirSync(path.dirname(absPath), { recursive: true });
      writeFileSync(absPath, materializeSkillFile(file.content), "utf8");
      written.push(file.relPath);
    }

    const addedPermissions = ensureClaudeSettings(rootDir);

    writeResult(
      {
        rootDir,
        written,
        skipped,
        addedPermissions,
      },
      { pretty: true }
    );
  });

program
  .command("methods")
  .description("List supported Framer methods and argument shapes")
  .option("--pretty", "Pretty-print JSON output")
  .action(async (options: { pretty?: boolean }) => {
    const result = Object.entries(METHOD_DEFINITIONS).map(([name, definition]) => ({
      name,
      summary: definition.summary,
      write: Boolean(definition.write),
      args: definition.args,
    }));

    writeResult(result, { pretty: options.pretty });
  });

withConnectionOptions(
  program
    .command("call")
    .description("Invoke a supported Framer method")
    .argument("<method>", "Method name from `framer-cli methods`")
    .option("--args <json>", "Inline JSON array of method arguments")
    .option("--args-file <path>", "Read a JSON array of method arguments from a file or '-' for stdin")
    .option("--allow-write", "Allow mutating methods like applyAgentChanges, publish, and deploy")
    .option("--raw", "Print string results without JSON encoding")
).action(async (methodName: string, options: CallOptions) => {
  const definition = METHOD_DEFINITIONS[methodName];
  if (!definition) {
    throw new CLIError(
      `Unsupported method "${methodName}". Run \`${CLI_NAME} methods\` to inspect the supported surface.`
    );
  }

  if (definition.write && !options.allowWrite) {
    throw new CLIError(
      `Method "${methodName}" mutates project state. Re-run with --allow-write once you intend to perform that change.`
    );
  }

  const args = await resolveArgs(options);

  await withFramerConnection(options, async (framer) => {
    const result = await definition.invoke(framer, args);
    writeResult(result, {
      pretty: options.pretty,
      raw: options.raw,
    });
  });
});

const cmsCommand = program.command("cms").description("Inspect and mutate Framer CMS collections and items");

withConnectionOptions(
  cmsCommand
    .command("collections")
    .description("List all collections in the current project")
).action(async (options: SharedConnectionOptions) => {
  await withFramerConnection(options, async (framer) => {
    const collections = await framer.getCollections();
    writeResult(collections.map(serializeCollection), { pretty: options.pretty });
  });
});

withConnectionOptions(
  cmsCommand
    .command("fields")
    .description("List fields for a collection")
    .argument("<collection>", "Collection id or name")
).action(async (collectionRef: string, options: SharedConnectionOptions) => {
  await withFramerConnection(options, async (framer) => {
    const collection = await resolveCollection(framer, collectionRef);
    const fields = await collection.getFields();
    writeResult(
      {
        collection: serializeCollection(collection),
        fields: fields.map(serializeField),
      },
      { pretty: options.pretty }
    );
  });
});

withConnectionOptions(
  cmsCommand
    .command("items")
    .description("List items in a collection")
    .argument("<collection>", "Collection id or name")
    .option("--limit <n>", "Maximum number of items to return", "50")
).action(async (collectionRef: string, options: CmsListOptions) => {
  await withFramerConnection(options, async (framer) => {
    const collection = await resolveCollection(framer, collectionRef);
    const items = await collection.getItems();
    writeResult(
      {
        collection: serializeCollection(collection),
        items: items.slice(0, parsePositiveInteger(options.limit, "--limit")).map(serializeCollectionItem),
      },
      { pretty: options.pretty }
    );
  });
});

withConnectionOptions(
  cmsCommand
    .command("get-item")
    .description("Get a specific item in a collection by id or slug")
    .argument("<collection>", "Collection id or name")
    .option("--id <id>", "Item id")
    .option("--slug <slug>", "Item slug")
).action(async (collectionRef: string, options: ItemSelectorOptions) => {
  await withFramerConnection(options, async (framer) => {
    const collection = await resolveCollection(framer, collectionRef);
    const item = await resolveCollectionItem(collection, options);
    writeResult(serializeCollectionItem(item), { pretty: options.pretty });
  });
});

withConnectionOptions(
  cmsCommand
    .command("upsert-item")
    .description("Create a new item or update an existing item in a collection")
    .argument("<collection>", "Collection id or name")
    .option("--item <json>", "Inline JSON object representing the item")
    .option("--item-file <path>", "Read the item JSON object from a file or '-' for stdin")
    .option("--draft", "Force the item to draft=true")
    .option("--published", "Force the item to draft=false")
    .option("--allow-write", "Allow mutating collection items")
).action(async (collectionRef: string, options: ItemInputOptions) => {
  assertWriteAllowed("cms upsert-item", options.allowWrite);

  await withFramerConnection(options, async (framer) => {
    const collection = await resolveCollection(framer, collectionRef);
    const item = await resolveItemPayload(options);
    const normalizedItem = applyDraftOverride(item, options);

    if (!normalizedItem.id && typeof normalizedItem.slug !== "string") {
      throw new CLIError("New collection items require a slug.");
    }

    const result = await saveCollectionItem(collection, normalizedItem);
    writeResult(
      {
        operation: result.operation,
        collection: serializeCollection(collection),
        item: result.item instanceof Object && "id" in result.item
          ? serializeCollectionItem(result.item as CollectionItem)
          : result.item,
      },
      { pretty: options.pretty }
    );
  });
});

withConnectionOptions(
  cmsCommand
    .command("remove-item")
    .description("Remove an item in a collection by id or slug")
    .argument("<collection>", "Collection id or name")
    .option("--id <id>", "Item id")
    .option("--slug <slug>", "Item slug")
    .option("--allow-write", "Allow mutating collection items")
).action(async (collectionRef: string, options: ItemSelectorOptions) => {
  assertWriteAllowed("cms remove-item", options.allowWrite);

  await withFramerConnection(options, async (framer) => {
    const collection = await resolveCollection(framer, collectionRef);
    const item = await resolveCollectionItem(collection, options);
    await item.remove();
    writeResult(
      {
        removed: true,
        collection: serializeCollection(collection),
        item: serializeCollectionItem(item),
      },
      { pretty: options.pretty }
    );
  });
});

const blogCommand = program.command("blog").description(`Convenience commands for the "${BLOG_COLLECTION_NAME}" collection`);

withConnectionOptions(
  blogCommand
    .command("fields")
    .description(`List fields for the "${BLOG_COLLECTION_NAME}" collection`)
).action(async (options: SharedConnectionOptions) => {
  await withFramerConnection(options, async (framer) => {
    const collection = await resolveCollection(framer, BLOG_COLLECTION_NAME);
    const fields = await collection.getFields();
    writeResult(
      {
        collection: serializeCollection(collection),
        fields: fields.map(serializeField),
      },
      { pretty: options.pretty }
    );
  });
});

withConnectionOptions(
  blogCommand
    .command("list")
    .description(`List items in the "${BLOG_COLLECTION_NAME}" collection`)
    .option("--limit <n>", "Maximum number of items to return", "50")
).action(async (options: CmsListOptions) => {
  await withFramerConnection(options, async (framer) => {
    const collection = await resolveCollection(framer, BLOG_COLLECTION_NAME);
    const items = await collection.getItems();
    writeResult(
      {
        collection: serializeCollection(collection),
        items: items.slice(0, parsePositiveInteger(options.limit, "--limit")).map(serializeCollectionItem),
      },
      { pretty: options.pretty }
    );
  });
});

withConnectionOptions(
  blogCommand
    .command("get")
    .description(`Get a specific blog item by id or slug`)
    .option("--id <id>", "Item id")
    .option("--slug <slug>", "Item slug")
).action(async (options: ItemSelectorOptions) => {
  await withFramerConnection(options, async (framer) => {
    const collection = await resolveCollection(framer, BLOG_COLLECTION_NAME);
    const item = await resolveCollectionItem(collection, options);
    writeResult(serializeCollectionItem(item), { pretty: options.pretty });
  });
});

withConnectionOptions(
  blogCommand
    .command("upsert")
    .description(`Create or update an item in the "${BLOG_COLLECTION_NAME}" collection`)
    .option("--item <json>", "Inline JSON object representing the item")
    .option("--item-file <path>", "Read the item JSON object from a file or '-' for stdin")
    .option("--draft", "Force the item to draft=true")
    .option("--published", "Force the item to draft=false")
    .option("--allow-write", "Allow mutating collection items")
).action(async (options: ItemInputOptions) => {
  assertWriteAllowed("blog upsert", options.allowWrite);

  await withFramerConnection(options, async (framer) => {
    const collection = await resolveCollection(framer, BLOG_COLLECTION_NAME);
    const item = await resolveItemPayload(options);
    const normalizedItem = applyDraftOverride(item, options);

    if (!normalizedItem.id && typeof normalizedItem.slug !== "string") {
      throw new CLIError("New blog items require a slug.");
    }

    const result = await saveCollectionItem(collection, normalizedItem);

    writeResult(
      {
        operation: result.operation,
        collection: serializeCollection(collection),
        item: result.item instanceof Object && "id" in result.item
          ? serializeCollectionItem(result.item as CollectionItem)
          : result.item,
      },
      { pretty: options.pretty }
    );
  });
});

withConnectionOptions(
  blogCommand
    .command("remove")
    .description(`Remove an item from the "${BLOG_COLLECTION_NAME}" collection by id or slug`)
    .option("--id <id>", "Item id")
    .option("--slug <slug>", "Item slug")
    .option("--allow-write", "Allow mutating collection items")
).action(async (options: ItemSelectorOptions) => {
  assertWriteAllowed("blog remove", options.allowWrite);

  await withFramerConnection(options, async (framer) => {
    const collection = await resolveCollection(framer, BLOG_COLLECTION_NAME);
    const item = await resolveCollectionItem(collection, options);
    await item.remove();
    writeResult(
      {
        removed: true,
        collection: serializeCollection(collection),
        item: serializeCollectionItem(item),
      },
      { pretty: options.pretty }
    );
  });
});

void program.parseAsync().catch(handleFatalError);

function withConnectionOptions<T extends Command>(command: T): T {
  return command
    .option(
      "-p, --project <urlOrId>",
      "Framer project URL or ID. Defaults to FRAMER_PROJECT_URL or FRAMER_PROJECT_ID."
    )
    .option("--api-key <token>", "Framer API key. Defaults to FRAMER_API_KEY.")
    .option("--server-url <url>", "Override the Framer API server URL")
    .option("--pretty", "Pretty-print JSON output");
}

function resolveRootDir(options: InitOptions) {
  if (options.gitCheck === false) {
    return process.cwd();
  }

  const gitRoot = findGitRoot(process.cwd());
  if (!gitRoot) {
    throw new CLIError("No git repository found. Re-run with --no-git-check to use the current directory.");
  }

  return gitRoot;
}

function findGitRoot(startDir: string) {
  let current = path.resolve(startDir);

  while (true) {
    if (existsSync(path.join(current, ".git"))) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

function materializeSkillFile(content: string) {
  return content.replaceAll("{{FRAMER_CLI_VERSION}}", packageJson.version);
}

function ensureClaudeSettings(rootDir: string) {
  const settingsPath = path.join(rootDir, ".claude", "settings.json");

  let settings: Record<string, unknown> = {};
  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, "utf8")) as Record<string, unknown>;
    } catch {
      settings = {};
    }
  }

  const permissions = ensureObject(settings, "permissions");
  const allow = ensureStringArray(permissions, "allow");
  const existing = new Set(allow);
  const addedPermissions: string[] = [];

  for (const permission of REQUIRED_PERMISSIONS) {
    if (!existing.has(permission)) {
      allow.push(permission);
      addedPermissions.push(permission);
    }
  }

  mkdirSync(path.dirname(settingsPath), { recursive: true });
  writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");

  return addedPermissions;
}

function ensureObject(root: Record<string, unknown>, key: string) {
  const existing = root[key];
  if (existing && typeof existing === "object" && !Array.isArray(existing)) {
    return existing as Record<string, unknown>;
  }

  const created: Record<string, unknown> = {};
  root[key] = created;
  return created;
}

function ensureStringArray(root: Record<string, unknown>, key: string) {
  const existing = root[key];
  if (Array.isArray(existing) && existing.every((value) => typeof value === "string")) {
    return existing as string[];
  }

  const created: string[] = [];
  root[key] = created;
  return created;
}

async function withFramerConnection<T>(
  options: SharedConnectionOptions,
  callback: (framer: Framer) => Promise<T>
) {
  const project = options.project ?? process.env.FRAMER_PROJECT_URL ?? process.env.FRAMER_PROJECT_ID;
  if (!project) {
    throw new CLIError("Missing project. Pass --project or set FRAMER_PROJECT_URL (or FRAMER_PROJECT_ID).");
  }

  const apiKey = options.apiKey ?? process.env.FRAMER_API_KEY;
  if (!apiKey) {
    throw new CLIError("Missing API key. Pass --api-key or set FRAMER_API_KEY.");
  }

  const framer = await connect(project, apiKey, buildConnectOptions(options));
  try {
    return await callback(framer);
  } finally {
    await framer.disconnect();
  }
}

function buildConnectOptions(options: Pick<SharedConnectionOptions, "serverUrl">) {
  return options.serverUrl ? { serverUrl: options.serverUrl } : undefined;
}

async function resolveArgs(options: Pick<CallOptions, "args" | "argsFile">): Promise<unknown[]> {
  if (options.args && options.argsFile) {
    throw new CLIError("Pass either --args or --args-file, not both.");
  }

  if (options.args) {
    return parseArgsPayload(options.args, "--args");
  }

  if (options.argsFile) {
    const payload = options.argsFile === "-" ? await readStdin() : await readFile(options.argsFile, "utf8");
    return parseArgsPayload(payload, "--args-file");
  }

  if (process.stdin.isTTY) {
    return [];
  }

  const payload = await readStdin();
  if (!payload.trim()) {
    return [];
  }

  return parseArgsPayload(payload, "stdin");
}

async function resolveItemPayload(options: Pick<ItemInputOptions, "item" | "itemFile">): Promise<CollectionItemInput> {
  if (options.item && options.itemFile) {
    throw new CLIError("Pass either --item or --item-file, not both.");
  }

  if (options.item) {
    return parseObjectPayload(options.item, "--item");
  }

  if (options.itemFile) {
    const payload = options.itemFile === "-" ? await readStdin() : await readFile(options.itemFile, "utf8");
    return parseObjectPayload(payload, "--item-file");
  }

  if (!process.stdin.isTTY) {
    const payload = await readStdin();
    if (payload.trim()) {
      return parseObjectPayload(payload, "stdin");
    }
  }

  throw new CLIError("Provide an item via --item, --item-file, or stdin.");
}

function applyDraftOverride(
  item: CollectionItemInput,
  options: Pick<ItemInputOptions, "draft" | "published">
): CollectionItemInput {
  if (options.draft && options.published) {
    throw new CLIError("Pass only one of --draft or --published.");
  }

  if (options.draft) {
    return {
      ...item,
      draft: true,
    };
  }

  if (options.published) {
    return {
      ...item,
      draft: false,
    };
  }

  return item;
}

async function resolveCollection(framer: Framer, collectionRef: string) {
  const collections = await framer.getCollections();
  const exactId = collections.find((collection) => collection.id === collectionRef);
  if (exactId) {
    return exactId;
  }

  const exactName = collections.find((collection) => collection.name === collectionRef);
  if (exactName) {
    return exactName;
  }

  const lowerRef = collectionRef.toLowerCase();
  const caseInsensitive = collections.find((collection) => collection.name.toLowerCase() === lowerRef);
  if (caseInsensitive) {
    return caseInsensitive;
  }

  throw new CLIError(`Collection "${collectionRef}" not found.`);
}

async function resolveCollectionItem(
  collection: Collection,
  selector: Pick<ItemSelectorOptions, "id" | "slug">
) {
  const { id, slug } = selector;
  if ((id && slug) || (!id && !slug)) {
    throw new CLIError("Provide exactly one of --id or --slug.");
  }

  const items = await collection.getItems();
  const item = id
    ? items.find((entry) => entry.id === id)
    : items.find((entry) => entry.slug === slug);

  if (!item) {
    throw new CLIError(`Collection item not found for selector ${id ? `id=${id}` : `slug=${slug}`}.`);
  }

  return item;
}

async function findUpsertedItem(
  collection: Collection,
  item: CollectionItemInput
) {
  const items = await collection.getItems();

  if (typeof item.id === "string") {
    return items.find((entry) => entry.id === item.id) ?? null;
  }

  if (typeof item.slug === "string") {
    return items.find((entry) => entry.slug === item.slug) ?? null;
  }

  return null;
}

async function saveCollectionItem(
  collection: Collection,
  item: CollectionItemInput
): Promise<{ operation: "created" | "updated"; item: CollectionItem | CollectionItemInput }> {
  if (typeof item.id === "string") {
    const existing = await resolveCollectionItem(collection, { id: item.id });
    const { id: _id, ...attributes } = item;
    const updated = await existing.setAttributes({
      ...attributes,
      slug: attributes.slug ?? existing.slug,
      draft: attributes.draft ?? existing.draft,
    });

    if (!updated) {
      throw new CLIError(`Collection item "${item.id}" no longer exists.`);
    }

    return {
      operation: "updated",
      item: updated,
    };
  }

  if (typeof item.slug === "string") {
    const items = await collection.getItems();
    const existing = items.find((entry) => entry.slug === item.slug);

    if (existing) {
      const updated = await existing.setAttributes({
        ...item,
        draft: item.draft ?? existing.draft,
      });

      if (!updated) {
        throw new CLIError(`Collection item with slug "${item.slug}" no longer exists.`);
      }

      return {
        operation: "updated",
        item: updated,
      };
    }
  }

  await collection.addItems([item]);
  const created = await findUpsertedItem(collection, item);

  return {
    operation: "created",
    item: created ?? item,
  };
}

function serializeCollection(collection: Collection) {
  return {
    id: collection.id,
    name: collection.name,
    slugFieldName: collection.slugFieldName,
    slugFieldBasedOn: collection.slugFieldBasedOn,
    readonly: collection.readonly,
    managedBy: collection.managedBy,
  };
}

function serializeField(field: CollectionField) {
  const result: Record<string, unknown> = {
    id: field.id,
    name: field.name,
    type: field.type,
  };

  if (field.type === "enum" && "cases" in field) {
    result.cases = field.cases.map((entry) => ({
      id: entry.id,
      name: entry.name,
    }));
  }

  if (field.type === "string" && "basedOn" in field) {
    result.basedOn = field.basedOn;
  }

  if (field.type === "date" && "displayTime" in field) {
    result.displayTime = field.displayTime;
  }

  return result;
}

function serializeCollectionItem(item: CollectionItem) {
  return {
    id: item.id,
    nodeId: item.nodeId,
    slug: item.slug,
    slugByLocale: item.slugByLocale,
    draft: item.draft,
    fieldData: item.fieldData,
  };
}

function parseArgsPayload(payload: string, source: string): unknown[] {
  const parsed = parseJson(payload, source);

  if (!Array.isArray(parsed)) {
    throw new CLIError(`${source} must be a JSON array of method arguments.`);
  }

  return parsed;
}

function parseObjectPayload(payload: string, source: string): CollectionItemInput {
  const parsed = parseJson(payload, source);
  if (!isCollectionItemInput(parsed)) {
    throw new CLIError(`${source} must be a JSON object.`);
  }
  return parsed;
}

function parseJson(payload: string, source: string) {
  try {
    return JSON.parse(payload) as unknown;
  } catch (error) {
    throw new CLIError(`Failed to parse ${source} as JSON: ${toErrorMessage(error)}`);
  }
}

function isCollectionItemInput(value: unknown): value is CollectionItemInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const item = value as Record<string, unknown>;

  if (item.id !== undefined && typeof item.id !== "string") {
    return false;
  }

  if (item.slug !== undefined && typeof item.slug !== "string") {
    return false;
  }

  if (item.draft !== undefined && typeof item.draft !== "boolean") {
    return false;
  }

  if (
    item.fieldData !== undefined &&
    (!item.fieldData || typeof item.fieldData !== "object" || Array.isArray(item.fieldData))
  ) {
    return false;
  }

  if (
    item.slugByLocale !== undefined &&
    (!item.slugByLocale || typeof item.slugByLocale !== "object" || Array.isArray(item.slugByLocale))
  ) {
    return false;
  }

  if (
    item.statusByLocale !== undefined &&
    (!item.statusByLocale || typeof item.statusByLocale !== "object" || Array.isArray(item.statusByLocale))
  ) {
    return false;
  }

  if (item.id === undefined && typeof item.slug !== "string") {
    return false;
  }

  return true;
}

function assertWriteAllowed(commandName: string, allowWrite?: boolean) {
  if (!allowWrite) {
    throw new CLIError(`${commandName} mutates project state. Re-run with --allow-write once you intend to perform that change.`);
  }
}

function assertMaxArgs(methodName: string, args: unknown[], maxArgs: number) {
  if (args.length > maxArgs) {
    throw new CLIError(`Method "${methodName}" accepts at most ${maxArgs} argument(s), received ${args.length}.`);
  }
}

function parseOptionalNumber(value: unknown, methodName: string, label: string) {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new CLIError(`Method "${methodName}" expects "${label}" to be a finite number when provided.`);
  }

  return value;
}

function parseRequiredString(value: unknown, methodName: string, label: string) {
  if (typeof value !== "string" || value.length === 0) {
    throw new CLIError(`Method "${methodName}" expects "${label}" to be a non-empty string.`);
  }

  return value;
}

function parseOptionalPageOptions(value: unknown, methodName: string) {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    throw new CLIError(`Method "${methodName}" expects the options argument to be an object.`);
  }

  const pagePath = (value as Record<string, unknown>).pagePath;
  if (pagePath !== undefined && typeof pagePath !== "string") {
    throw new CLIError(`Method "${methodName}" expects options.pagePath to be a string when provided.`);
  }

  return pagePath === undefined ? {} : { pagePath };
}

function parseQueryArray(value: unknown, methodName: string) {
  if (!Array.isArray(value)) {
    throw new CLIError(`Method "${methodName}" expects the first argument to be an array of query objects.`);
  }

  for (const [index, item] of value.entries()) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new CLIError(`Method "${methodName}" expects queries[${index}] to be an object.`);
    }
  }

  return value as Record<string, unknown>[];
}

function parseOptionalStringArray(value: unknown, methodName: string, label: string) {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new CLIError(`Method "${methodName}" expects "${label}" to be an array of strings when provided.`);
  }

  return value;
}

function parsePositiveInteger(rawValue: string | undefined, label: string) {
  const value = Number(rawValue);
  if (!Number.isInteger(value) || value <= 0) {
    throw new CLIError(`${label} must be a positive integer.`);
  }
  return value;
}

async function readStdin() {
  const chunks: string[] = [];

  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === "string" ? chunk : chunk.toString("utf8"));
  }

  return chunks.join("");
}

function writeResult(
  result: unknown,
  options: {
    pretty?: boolean;
    raw?: boolean;
  }
) {
  if (options.raw) {
    if (typeof result !== "string") {
      throw new CLIError("--raw can only be used when the command returns a string.");
    }

    process.stdout.write(result);
    if (!result.endsWith("\n")) {
      process.stdout.write("\n");
    }
    return;
  }

  const normalized = result === undefined ? { ok: true } : result;
  const output = JSON.stringify(normalized, jsonReplacer, shouldPrettyPrint(options.pretty) ? 2 : undefined);

  if (!output) {
    throw new CLIError("Failed to serialize command output.");
  }

  process.stdout.write(`${output}\n`);
}

function shouldPrettyPrint(pretty?: boolean) {
  return pretty ?? Boolean(process.stdout.isTTY);
}

function jsonReplacer(_key: string, value: unknown) {
  if (typeof value === "bigint") {
    return value.toString();
  }

  if (value instanceof Map) {
    return Object.fromEntries(value);
  }

  if (value instanceof Set) {
    return Array.from(value);
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  return value;
}

function loadEnvFileIfPresent() {
  if (typeof process.loadEnvFile !== "function") {
    return;
  }

  try {
    process.loadEnvFile();
  } catch (error) {
    if (isFileNotFoundError(error)) {
      return;
    }

    throw new CLIError(`Failed to load .env from the current working directory: ${toErrorMessage(error)}`);
  }
}

function handleFatalError(error: unknown) {
  const exitCode = error instanceof CLIError ? error.exitCode : 1;
  const payload = {
    error: {
      name: error instanceof Error ? error.name : "Error",
      message: toErrorMessage(error),
    },
  };

  process.stderr.write(`${JSON.stringify(payload)}\n`);
  process.exit(exitCode);
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return typeof error === "string" ? error : "Unknown error";
}

function isFileNotFoundError(error: unknown) {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
