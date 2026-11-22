# Members

The people in the workspace. A module: one shared object.

A module: one object, shared by every call. Interactive: [Members in the app](../../application/app-api-docs.html#/rpc/Members).

| Method | Signature | Description |
| --- | --- | --- |
| [list](Members/list.md) | `async list(role?: Role | undefined): Promise<Member[]>` | Lists the members. |
| [invite](Members/invite.md) | `async invite(email: string, role?: Role): Promise<Member>` | Invites someone by email; they stay invited until they accept. |
