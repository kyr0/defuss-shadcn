# Update a task

`PATCH https://api.acme.example/v4/tasks/{id}`

Changes the fields you send and leaves the rest as they are.

## Path parameters

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | `string` | yes | The task's id. |

## Body parameters

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `title` | `string` | no | A new title. |
| `status` | `todo \| doing \| done` | no | A new status. |
| `assignee` | `string` | no | Another member, or none to unassign. |

## Responses

| Status | Meaning |
| --- | --- |
| 200 | The object, or a page of the list |
| 400 | A parameter is missing or wrong |
| 401 | No valid API key |
| 404 | No object with that id |

```bash
curl -X PATCH https://api.acme.example/v4/tasks/{id} \
  -H "Authorization: Bearer $ACME_API_KEY"
```

Interactive: [Update a task in the app](../../../application/app-api-docs.html#/ref/tasks/update).
