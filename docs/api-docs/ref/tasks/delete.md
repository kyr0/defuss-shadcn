# Delete a task

`DELETE https://api.acme.example/v4/tasks/{id}`

Deletes a task for good. Its comments go with it.

## Path parameters

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | `string` | yes | The task's id. |

## Responses

| Status | Meaning |
| --- | --- |
| 200 | The object, or a page of the list |
| 401 | No valid API key |
| 404 | No object with that id |

```bash
curl -X DELETE https://api.acme.example/v4/tasks/{id} \
  -H "Authorization: Bearer $ACME_API_KEY"
```

Interactive: [Delete a task in the app](../../../application/app-api-docs.html#/ref/tasks/delete).
