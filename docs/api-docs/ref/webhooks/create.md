# Create a webhook

`POST https://api.acme.example/v4/webhooks`

Registers a URL for events. The answer carries the signing secret - the only time it is shown.

## Body parameters

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `url` | `string` | yes | An HTTPS URL that answers 2xx. |
| `events` | `string[]` | yes | The events, separated by commas. |

## Responses

| Status | Meaning |
| --- | --- |
| 201 | Created - the new object |
| 400 | A parameter is missing or wrong |
| 401 | No valid API key |

```bash
curl -X POST https://api.acme.example/v4/webhooks \
  -H "Authorization: Bearer $ACME_API_KEY"
```

Interactive: [Create a webhook in the app](../../../application/app-api-docs.html#/ref/webhooks/create).
