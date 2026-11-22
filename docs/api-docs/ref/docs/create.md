# Create a doc

`POST https://api.acme.example/v4/docs`

Creates a doc from a title and a Markdown body.

## Body parameters

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `workspace` | `string` | yes | The workspace the doc belongs to. |
| `title` | `string` | yes | The doc's title. |
| `body` | `string` | no | The text, in Markdown. |

## Responses

| Status | Meaning |
| --- | --- |
| 201 | Created - the new object |
| 400 | A parameter is missing or wrong |
| 401 | No valid API key |

```bash
curl -X POST https://api.acme.example/v4/docs \
  -H "Authorization: Bearer $ACME_API_KEY"
```

Interactive: [Create a doc in the app](../../../application/app-api-docs.html#/ref/docs/create).
