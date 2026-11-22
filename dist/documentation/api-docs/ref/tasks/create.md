# Create a task

`POST https://api.acme.example/v4/tasks`

Creates a task in a workspace and returns it.

## Body parameters

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `workspace` | `string` | yes | The workspace the task belongs to. |
| `title` | `string` | yes | What has to be done. |
| `assignee` | `string` | no | The member who does it. |
| `due_on` | `date` | no | The day it is due, YYYY-MM-DD. |
| `status` | `todo \| doing \| done` | no | Starts as todo when left out. |

## Responses

| Status | Meaning |
| --- | --- |
| 201 | Created - the new object |
| 400 | A parameter is missing or wrong |
| 401 | No valid API key |

```bash
curl -X POST https://api.acme.example/v4/tasks \
  -H "Authorization: Bearer $ACME_API_KEY"
```

Interactive: [Create a task in the app](../../../application/app-api-docs.html#/ref/tasks/create).
