export const BLOG_TEMPLATE = `# Blog And CMS Workflows

Use this guide for blog-post creation, editing, verification, deletion, and thumbnail generation.

## Current Blog Collection

The current Framer project has a user-managed collection named \`Blog\`.

Use these commands to inspect it:

\`\`\`bash
framer-cli blog fields
framer-cli blog list --limit 20
\`\`\`

## Current Blog Field Map

As of the current project schema:

- \`Pfx5_b5ap\` — \`Title\` (\`string\`)
- \`qTKsMl_6r\` — \`Category\` (\`enum\`)
- \`OlVYsaJ0N\` — \`Author Profile Image\` (\`image\`)
- \`vbshpsmrv\` — \`Author\` (\`string\`)
- \`V1tA1xhKv\` — \`Author Job Title\` (\`string\`)
- \`i9ezyRZxC\` — \`Date\` (\`date\`)
- \`k1F9wAHMm\` — \`Thumbnail\` (\`image\`)
- \`dBE2k2jxM\` — \`Content\` (\`formattedText\`)

Current \`Category\` enum case IDs:

- \`kn1jZEk7l\` — \`Launch\`
- \`rmnYJpMx8\` — \`Article\`

When writing an enum field, use the case ID, not the label.

## Safe Workflow For New Posts

1. Inspect the current schema:

\`\`\`bash
framer-cli blog fields
\`\`\`

2. Prepare a JSON payload and set \`draft: true\`.
3. Generate a relevant thumbnail as SVG, rasterize it to PNG, and use that PNG for \`k1F9wAHMm\`.
4. Create or update the post with \`blog upsert\`.
5. Read the post back with \`blog get\`.
6. Only publish the site if the user explicitly asks for a publish.

\`blog upsert\` updates an existing item when the payload includes either:

- the existing item \`id\`
- a \`slug\` that already exists in the collection
- and it preserves the current draft state unless you explicitly change it

## Example Draft Blog Post

\`\`\`json
{
  "slug": "test-post-slug",
  "draft": true,
  "fieldData": {
    "Pfx5_b5ap": {
      "type": "string",
      "value": "My Test Blog Post"
    },
    "qTKsMl_6r": {
      "type": "enum",
      "value": "rmnYJpMx8"
    },
    "OlVYsaJ0N": {
      "type": "image",
      "value": "https://framerusercontent.com/images/example-author.jpeg"
    },
    "vbshpsmrv": {
      "type": "string",
      "value": "Author Name"
    },
    "V1tA1xhKv": {
      "type": "string",
      "value": "Author Title"
    },
    "i9ezyRZxC": {
      "type": "date",
      "value": "2026-03-16T00:00:00.000Z"
    },
    "k1F9wAHMm": {
      "type": "image",
      "value": "https://framerusercontent.com/images/example-thumbnail.jpeg"
    },
    "dBE2k2jxM": {
      "type": "formattedText",
      "contentType": "markdown",
      "value": "# Heading\\n\\nThis paragraph includes **bold text**."
    }
  }
}
\`\`\`

## Create Or Update A Post

Write the payload to a file, then:

\`\`\`bash
framer-cli blog upsert --item-file post.json --allow-write
\`\`\`

Read it back:

\`\`\`bash
framer-cli blog get --slug "test-post-slug"
\`\`\`

## Blog Thumbnail Workflow

Prefer generating a fresh blog image instead of reusing an unrelated thumbnail.

Use this workflow:

1. Write a simple SVG sized for social/blog cards at \`1200x630\`.
2. Keep the layout simple and safe:
   use one short headline, optional one short supporting line, and no busy decorative elements.
3. Keep wide margins and leave empty space around the text block so nothing feels cramped at preview sizes.
4. Avoid long labels, dense copy, oversized icons, or multiple visual focal points.
5. Rasterize the SVG to PNG with \`sips\`.
6. Use the PNG path or uploaded Framer-hosted URL for \`k1F9wAHMm\`.

Example:

\`\`\`bash
cat > blog-card.svg <<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#0d1b24"/>
  <text x="84" y="250" fill="#f4fff6" font-size="82" font-family="Arial, Helvetica, sans-serif" font-weight="700">
    Playwright in 2026
  </text>
  <text x="84" y="332" fill="#8df06f" font-size="38" font-family="Arial, Helvetica, sans-serif">
    Timeline, UI Mode, and upgrade changes
  </text>
</svg>
SVG

sips -s format png blog-card.svg --out blog-card.png
\`\`\`

After writing the post, read it back and prefer the Framer-hosted URL returned by \`fieldData.k1F9wAHMm.value.url\` for future updates.

## Update An Existing Post

Use one of these patterns:

- Include the existing \`id\` when you want to guarantee the exact item is updated.
- Reuse the existing \`slug\` to update by slug when the slug is already unique in the collection.

Use \`blog get --slug <slug>\` first if you need the item id.

For id-based updates, you can omit \`slug\`. The CLI preserves the current slug automatically unless you explicitly change it.

When reusing an existing image from a read response, copy the nested URL:

- \`fieldData.OlVYsaJ0N.value.url\`
- \`fieldData.k1F9wAHMm.value.url\`

## Delete A Post

\`\`\`bash
framer-cli blog remove --slug "test-post-slug" --allow-write
\`\`\`

## Generic CMS Commands

If the task is not specific to the \`Blog\` collection, use the \`cms\` namespace directly:

\`\`\`bash
framer-cli cms collections
framer-cli cms fields <collection>
framer-cli cms items <collection>
framer-cli cms get-item <collection> --slug "<slug>"
framer-cli cms upsert-item <collection> --item-file item.json --allow-write
\`\`\`

## Working Rules

- Default new posts to drafts.
- Default thumbnails to a new SVG-rendered PNG unless the user explicitly asks to reuse an existing image.
- Keep thumbnails simple. If a design feels crowded, remove elements instead of adding more layout structure.
- Verify the item after every write.
- Confirm the current schema before relying on hard-coded field IDs if the collection may have changed.
- Prefer the blog wrapper commands because they target the existing \`Blog\` collection directly.
`;
