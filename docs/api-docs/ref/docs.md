# Docs

A doc is a page of text in a workspace, written in Markdown.

## Endpoints

- [List docs](docs/list.md) - `GET /docs`
- [Create a doc](docs/create.md) - `POST /docs`
- [Retrieve a doc](docs/retrieve.md) - `GET /docs/{id}`

## The doc object

| Field | Type | Description |
| --- | --- | --- |
| `id` | `string` | Unique identifier, starting with d_. |
| `title` | `string` | The doc's title. |
| `body` | `string` | The text, in Markdown. |
| `workspace` | `string` | The workspace it belongs to. |
| `updated_at` | `timestamp` | When it last changed, in UTC. |

Interactive: [Docs in the app](../../application/app-api-docs.html#/ref/docs).
