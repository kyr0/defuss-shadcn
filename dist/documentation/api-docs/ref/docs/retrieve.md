# Retrieve a doc

`GET https://api.acme.example/v4/docs/{id}`

Returns one doc with its whole body.

## Path parameters

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | `string` | yes | The doc's id. |

## Responses

| Status | Meaning |
| --- | --- |
| 200 | The object, or a page of the list |
| 401 | No valid API key |
| 404 | No object with that id |

```bash
curl -X GET https://api.acme.example/v4/docs/{id} \
  -H "Authorization: Bearer $ACME_API_KEY"
```

Interactive: [Retrieve a doc in the app](../../../application/app-api-docs.html#/ref/docs/retrieve).
