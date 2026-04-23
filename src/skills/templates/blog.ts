export const BLOG_TEMPLATE = `# Blog And CMS Workflows

Use this guide for blog post creation, editing, verification, deletion, and thumbnail generation.

## Blog Collection Assumption

The \`framer-cli blog ...\` commands target a collection named \`Blog\`.

Before writing content, inspect the current project schema:

\`\`\`bash
framer-cli blog fields --pretty
framer-cli blog list --limit 20 --pretty
\`\`\`

If the project does not have a \`Blog\` collection, use the generic \`cms\` commands instead:

\`\`\`bash
framer-cli cms collections --pretty
framer-cli cms fields <collection> --pretty
\`\`\`

## Safe Workflow For New Posts

1. Inspect the current schema with \`framer-cli blog fields --pretty\`.
2. Identify the field IDs and enum case IDs for the project you are editing.
3. Prepare a JSON payload and default it to \`draft: true\`.
4. Generate a relevant thumbnail when the project has a thumbnail image field.
5. Create or update the post with \`blog upsert --allow-write\`.
6. Read the post back with \`blog get\`.
7. Publish the site only if the user explicitly asks for a publish.

\`blog upsert\` updates an existing item when the payload includes either:

- the existing item \`id\`
- a \`slug\` that already exists in the collection

It preserves the current draft state unless you explicitly change it.

## Example Draft Blog Post

Replace the field IDs with values from \`framer-cli blog fields --pretty\`.

\`\`\`json
{
  "slug": "example-post-slug",
  "draft": true,
  "fieldData": {
    "TITLE_FIELD_ID": {
      "type": "string",
      "value": "My Test Blog Post"
    },
    "CATEGORY_FIELD_ID": {
      "type": "enum",
      "value": "ENUM_CASE_ID"
    },
    "DATE_FIELD_ID": {
      "type": "date",
      "value": "2026-03-16T00:00:00.000Z"
    },
    "THUMBNAIL_FIELD_ID": {
      "type": "image",
      "value": "https://framerusercontent.com/images/example-thumbnail.jpeg"
    },
    "CONTENT_FIELD_ID": {
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
framer-cli blog upsert --item-file post.json --allow-write --pretty
\`\`\`

Read it back:

\`\`\`bash
framer-cli blog get --slug "example-post-slug" --pretty
\`\`\`

## Blog Thumbnail Workflow

Prefer generating a fresh blog image instead of reusing an unrelated thumbnail.

Use this workflow:

1. Write a simple SVG sized for social/blog cards at \`1200x630\`.
2. Use one short headline, optional one short supporting line, and no busy decorative elements.
3. Keep wide margins and leave empty space around the text block.
4. Avoid long labels, dense copy, oversized icons, or multiple visual focal points.
5. Rasterize the SVG to PNG with \`sips\`.
6. Use the PNG path or uploaded Framer-hosted URL for the project's thumbnail image field.

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

After writing the post, read it back and prefer the Framer-hosted URL returned by the image field's \`value.url\` for future updates.

## Update An Existing Post

Use one of these patterns:

- Include the existing \`id\` when you want to guarantee the exact item is updated.
- Reuse the existing \`slug\` to update by slug when the slug is already unique in the collection.

Use \`blog get --slug <slug>\` first if you need the item id.

For id-based updates, you can omit \`slug\`. The CLI preserves the current slug automatically unless you explicitly change it.

When reusing an existing image from a read response, copy the nested URL from the relevant image field's \`value.url\`.

## Delete A Post

\`\`\`bash
framer-cli blog remove --slug "example-post-slug" --allow-write --pretty
\`\`\`

## Generic CMS Commands

If the task is not specific to the \`Blog\` collection, use the \`cms\` namespace directly:

\`\`\`bash
framer-cli cms collections --pretty
framer-cli cms fields <collection> --pretty
framer-cli cms items <collection> --pretty
framer-cli cms get-item <collection> --slug "<slug>" --pretty
framer-cli cms upsert-item <collection> --item-file item.json --allow-write --pretty
\`\`\`

## Working Rules

- Default new posts to drafts.
- Inspect the current schema before relying on field IDs.
- Use enum case IDs when writing enum fields.
- Default thumbnails to a new SVG-rendered PNG unless the user explicitly asks to reuse an existing image.
- Keep thumbnails simple. If a design feels crowded, remove elements instead of adding more layout structure.
- Verify the item after every write.
- Prefer the blog wrapper commands when the project has a \`Blog\` collection.
`;
