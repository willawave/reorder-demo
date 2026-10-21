# Brand files

Copied 2026-10-21 from `willawave-ai/projects/web/public/brand/`. **willawave-ai is the source of
truth:** change a file there first, then copy it here. Don't edit these copies on their own.

Don't extract a shared library yet. willawave-ai's brand README sets the trigger at a third
consumer, and this demo is the second.

## The filenames are inverted

| File                                | What it actually is               |
| ----------------------------------- | --------------------------------- |
| `wordmark.svg`, `wordmark-dark.svg` | the **W mark** alone (pure paths) |

They're kept as-is so both repos match. The header pairs `wordmark.svg` with live HTML text.

## In use

- `favicon.svg`, `apple-touch-icon.png`: linked from `src/index.html`. `/favicon.ico` at the
  public root is the brand `.ico` too, for crawlers that probe it blindly.
- `wordmark.svg`, `wordmark-dark.svg`: the header mark. CSS shows one per theme.
- `og-1200x630.png`: the Open Graph card. It's WillaWave's own card until the demo has one.
- `icon-192.png`, `icon-512.png`: copied for completeness; no manifest links them yet.
