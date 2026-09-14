---
name: lazycode-learning
description: Turn the current agent-user Q&A into a concise, bullet-based Lazycode quick-reference Markdown file with practical examples. Use at the end of a learning session or when asked to save the conversation.
compatibility: pi, opencode
---

# Create a quick reference

When invoked, use the **entire current conversation** and the relevant repository files already inspected. Always create a new Markdown file under `convo/`; never overwrite an existing learning file.

## Filename

Choose a descriptive kebab-case name based on the main topic:

```text
convo/mastra-phase-2-controller-quick-reference.md
```

If the name already exists, add `-2`, `-3`, or a more specific topic. Do not use timestamps.

## Output format

Keep the file short and useful for future lookup. Prefer bullets over paragraphs and include small examples.

```markdown
# <Topic> — Quick Reference

## Key ideas

- **Term:** plain-language meaning.
- **Term:** why it matters in this project.

## How it works

```text
user request → controller → agent → tool → result
```

## Example

```ts
// small relevant example
```

- What happens first.
- What happens next.

## Project files

- `path/to/file.ts` — what it owns.
- `path/to/test.ts` — what it demonstrates.

## Glossary

- **Term:** short definition.
```

Use only sections that add value. Add a short `## Follow-ups` section only when the conversation leaves concrete unanswered questions.

## Rules

- Capture the durable lessons from the complete Q&A, not a full transcript.
- Keep bullets concise, beginner-friendly, accurate, and self-contained.
- Include exact file paths, symbols, and small code or flow examples when useful.
- Clearly distinguish Lazycode code from Node.js, Hono, Mastra Core, Mastra Code SDK, and other dependencies.
- Preserve important corrections from the conversation.
- Do not add a separate “tested” or “not tested” section.
- Do not invent answers; put unresolved points in `## Follow-ups`.
- Do not record secrets, huge logs, or unchanged source files.
- This skill only documents the conversation; do not change application code.

After writing the new file, briefly tell the user exactly where it was saved.
