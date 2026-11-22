# List docs

`GET https://api.acme.example/v4/docs`

Returns the docs of a workspace, the most recently changed first.

## Query parameters

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `workspace` | `string` | yes | The workspace to list. |
| `limit` | `integer` | no | Objects per page, 1 to 100. |

## Responses

| Status | Meaning |
| --- | --- |
| 200 | The object, or a page of the list |
| 400 | A parameter is missing or wrong |
| 401 | No valid API key |

```bash
curl -X GET https://api.acme.example/v4/docs \
  -H "Authorization: Bearer $ACME_API_KEY"
```

Interactive: [List docs in the app](../../../application/app-api-docs.html#/ref/docs/list).
