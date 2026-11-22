# Members

A member is a person in a workspace, with a role that sets what they may do.

## Endpoints

- [List members](members/list.md) - `GET /workspaces/{workspace}/members`
- [Invite a member](members/invite.md) - `POST /workspaces/{workspace}/members`

## The member object

| Field | Type | Description |
| --- | --- | --- |
| `id` | `string` | Unique identifier, starting with m_. |
| `email` | `string` | The address the invitation went to. |
| `role` | `enum` | admin, member or guest. |
| `status` | `enum` | invited or active. |

Interactive: [Members in the app](../../application/app-api-docs.html#/ref/members).
