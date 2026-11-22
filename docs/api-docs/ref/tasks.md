# Tasks

A task is a piece of work in a workspace with a status, an assignee and a due date.

## Endpoints

- [List tasks](tasks/list.md) - `GET /tasks`
- [Create a task](tasks/create.md) - `POST /tasks`
- [Retrieve a task](tasks/retrieve.md) - `GET /tasks/{id}`
- [Update a task](tasks/update.md) - `PATCH /tasks/{id}`
- [Delete a task](tasks/delete.md) - `DELETE /tasks/{id}`

## The task object

| Field | Type | Description |
| --- | --- | --- |
| `id` | `string` | Unique identifier, starting with t_. |
| `title` | `string` | What has to be done. |
| `status` | `enum` | todo, doing or done. |
| `assignee` | `string | null` | The member who does it, or null. |
| `due_on` | `date | null` | The day it is due, as YYYY-MM-DD. |
| `workspace` | `string` | The workspace it belongs to. |
| `created_at` | `timestamp` | When it was created, in UTC. |

Interactive: [Tasks in the app](../../application/app-api-docs.html#/ref/tasks).
