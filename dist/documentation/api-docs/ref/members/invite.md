# Invite a member

`POST https://api.acme.example/v4/workspaces/{workspace}/members`

Sends an invitation by email. The member is invited until they accept.

## Path parameters

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `workspace` | `string` | yes | The workspace. |

## Body parameters

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `email` | `string` | yes | Where the invitation goes. |
| `role` | `admin \| member \| guest` | no | member when left out. |

## Responses

| Status | Meaning |
| --- | --- |
| 201 | Created - the new object |
| 400 | A parameter is missing or wrong |
| 401 | No valid API key |
| 404 | No object with that id |

```bash
curl -X POST https://api.acme.example/v4/workspaces/{workspace}/members \
  -H "Authorization: Bearer $ACME_API_KEY"
```

Interactive: [Invite a member in the app](../../../application/app-api-docs.html#/ref/members/invite).
