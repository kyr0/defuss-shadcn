# Delete a webhook

`DELETE https://api.acme.example/v4/webhooks/{id}`

Stops the deliveries to an endpoint at once.

## Path parameters

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | `string` | yes | The webhook's id. |

## Responses

| Status | Meaning |
| --- | --- |
| 200 | The object, or a page of the list |
| 401 | No valid API key |
| 404 | No object with that id |

```bash
curl -X DELETE https://api.acme.example/v4/webhooks/{id} \
  -H "Authorization: Bearer $ACME_API_KEY"
```

Interactive: [Delete a webhook in the app](../../../application/app-api-docs.html#/ref/webhooks/delete).
