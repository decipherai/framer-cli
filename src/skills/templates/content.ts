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

For blog thumbnails, do not default to a random external image. Prefer generating a topical SVG locally and rasterizing it to PNG.
Keep the design simple enough to survive small preview cards.

When reading an existing item back, the image field usually comes back as an object. Reuse the URL from \`value.url\`, then write that URL string back into the next payload.

## Safest Image Workflow

The safest path is to reuse a known-good Framer-hosted image URL from an existing item.

Inspect a current post:

\`\`\`bash
framer-cli blog get --slug "existing-post-slug"
\`\`\`

Then copy the image URL you want to reuse into the new item payload.

## Preferred Thumbnail Workflow

For new blog posts, prefer this instead:

1. Generate a simple SVG at \`1200x630\`.
2. Render it to PNG with \`sips -s format png input.svg --out output.png\`.
3. Use the PNG for the blog thumbnail field.
4. After Framer ingests the image, reuse the returned Framer-hosted URL on later updates.

The local SVG->PNG path is deterministic and keeps thumbnails aligned with the post title and subject.

Design rules:

- Use one main headline.
- Use at most one short supporting line.
- Prefer plain background shapes over complex illustration.
- Keep generous padding on all sides.
- If text is getting long, shorten the copy instead of shrinking the font aggressively.
- Avoid small labels, pills, badges, and decorative widgets unless they are clearly necessary.

Minimal example:

\`\`\`svg
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#0d1b24"/>
  <text x="84" y="250" fill="#f4fff6" font-size="82" font-family="Arial, Helvetica, sans-serif" font-weight="700">
    Playwright 2026
  </text>
  <text x="84" y="332" fill="#8df06f" font-size="38" font-family="Arial, Helvetica, sans-serif">
    Timeline, UI Mode, and upgrade changes
  </text>
</svg>
\`\`\`

Rasterize it:

\`\`\`bash
sips -s format png blog-card.svg --out blog-card.png
\`\`\`

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
