# Retrieve a task

`GET https://api.acme.example/v4/tasks/{id}`

Returns one task by its id.

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
curl -X GET https://api.acme.example/v4/tasks/{id} \
  -H "Authorization: Bearer $ACME_API_KEY"
```

Interactive: [Retrieve a task in the app](../../../application/app-api-docs.html#/ref/tasks/retrieve).
