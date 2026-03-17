export const CONTENT_TEMPLATE = `# Content Formatting, Markdown, HTML, And Images

Use this guide when writing \`formattedText\` or \`image\` CMS fields.

## Formatted Text

The \`Content\` field in the current \`Blog\` collection is a \`formattedText\` field.

When writing it, prefer explicit \`contentType\` values.

### Markdown

Use:

\`\`\`json
{
  "type": "formattedText",
  "contentType": "markdown",
  "value": "This sentence has **bold text**."
}
\`\`\`

Use \`markdown\` when you want familiar syntax for:

- \`**bold**\`
- \`# headings\`
- \`- bullet lists\`
- inline links like \`[label](https://example.com)\`

For bold specifically, the working pattern is:

\`\`\`markdown
The key check is this: **this text should be bold**.
\`\`\`

Framer stores the result as HTML and should convert that to:

\`\`\`html
<strong>this text should be bold</strong>
\`\`\`

### HTML

Use:

\`\`\`json
{
  "type": "formattedText",
  "contentType": "html",
  "value": "<p>The key check is this: <strong>this text should be bold</strong>.</p>"
}
\`\`\`

Use \`html\` when you need precise control over tags or when you already have trusted HTML.

Prefer explicit tags for:

- \`<strong>\` for bold
- \`<h2>\` or \`<h3>\` for headings
- \`<ul>\` and \`<li>\` for lists
- \`<a href="...">\` for links

### Auto

The SDK also supports \`contentType: "auto"\`, but prefer \`markdown\` or \`html\` explicitly so the input format is unambiguous.

## Images

Framer CMS image fields accept a string URL when writing.

Pattern:

\`\`\`json
{
  "type": "image",
  "value": "https://framerusercontent.com/images/example-image.jpeg"
}
\`\`\`

Current blog image fields:

- \`OlVYsaJ0N\` — author profile image
- \`k1F9wAHMm\` — thumbnail

When reading an existing item back, the image field usually comes back as an object. Reuse the URL from \`value.url\`, then write that URL string back into the next payload.

## Safest Image Workflow

The safest path is to reuse a known-good Framer-hosted image URL from an existing item.

Inspect a current post:

\`\`\`bash
framer-cli blog get --slug "existing-post-slug"
\`\`\`

Then copy the image URL you want to reuse into the new item payload.

## Dates

Use ISO strings for CMS dates:

\`\`\`json
{
  "type": "date",
  "value": "2026-03-16T00:00:00.000Z"
}
\`\`\`

## Strings

Use:

\`\`\`json
{
  "type": "string",
  "value": "Example text"
}
\`\`\`

## Enums

Use the enum case ID, not the human-readable label.

Example for the current \`Blog\` \`Category\` field:

\`\`\`json
{
  "type": "enum",
  "value": "rmnYJpMx8"
}
\`\`\`

\`rmnYJpMx8\` maps to \`Article\`.

## Practical Rule Of Thumb

- If you want Markdown syntax like \`**bold**\`, set \`contentType\` to \`markdown\`.
- If you are writing raw tags like \`<strong>\`, set \`contentType\` to \`html\`.
- If the field is an image field, write a URL string.
- If the field is an enum, write the case ID.
`;
