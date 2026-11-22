# Webhooks

A webhook endpoint receives a signed POST for every event it subscribes to.

## Endpoints

- [List webhooks](webhooks/list.md) - `GET /webhooks`
- [Create a webhook](webhooks/create.md) - `POST /webhooks`
- [Delete a webhook](webhooks/delete.md) - `DELETE /webhooks/{id}`

## The webhook object

| Field | Type | Description |
| --- | --- | --- |
| `id` | `string` | Unique identifier, starting with wh_. |
| `url` | `string` | Where the events are sent, over HTTPS. |
| `events` | `string[]` | The events it receives, such as task.created. |
| `secret` | `string` | Signs every delivery - shown once, on creation. |

Interactive: [Webhooks in the app](../../application/app-api-docs.html#/ref/webhooks).
