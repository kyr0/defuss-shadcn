# List webhooks

`GET https://api.acme.example/v4/webhooks`

Returns every webhook endpoint of the key's workspace.

## Responses

| Status | Meaning |
| --- | --- |
| 200 | The object, or a page of the list |
| 401 | No valid API key |

```bash
curl -X GET https://api.acme.example/v4/webhooks \
  -H "Authorization: Bearer $ACME_API_KEY"
```

Interactive: [List webhooks in the app](../../../application/app-api-docs.html#/ref/webhooks/list).
