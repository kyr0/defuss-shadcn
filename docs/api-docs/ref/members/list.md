# List members

`GET https://api.acme.example/v4/workspaces/{workspace}/members`

Returns everyone in a workspace, with their role and status.

## Path parameters

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `workspace` | `string` | yes | The workspace. |

## Query parameters

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `role` | `admin \| member \| guest` | no | Only members with this role. |

## Responses

| Status | Meaning |
| --- | --- |
| 200 | The object, or a page of the list |
| 401 | No valid API key |
| 404 | No object with that id |

```bash
curl -X GET https://api.acme.example/v4/workspaces/{workspace}/members \
  -H "Authorization: Bearer $ACME_API_KEY"
```

Interactive: [List members in the app](../../../application/app-api-docs.html#/ref/members/list).
