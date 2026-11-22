# List tasks

`GET https://api.acme.example/v4/tasks`

Returns the tasks of a workspace, newest first, a page at a time.

## Query parameters

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `workspace` | `string` | yes | The workspace to list. |
| `status` | `todo \| doing \| done` | no | Only tasks with this status. |
| `limit` | `integer` | no | Objects per page, 1 to 100. |
| `cursor` | `string` | no | The next_cursor of the previous page. |

## Responses

| Status | Meaning |
| --- | --- |
| 200 | The object, or a page of the list |
| 400 | A parameter is missing or wrong |
| 401 | No valid API key |

```bash
curl -X GET https://api.acme.example/v4/tasks \
  -H "Authorization: Bearer $ACME_API_KEY"
```

Interactive: [List tasks in the app](../../../application/app-api-docs.html#/ref/tasks/list).
