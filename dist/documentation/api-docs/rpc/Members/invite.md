# Members.invite

```ts
async invite(email: string, role?: Role): Promise<Member>
```

Invites someone by email; they stay invited until they accept.

Answers once. Interactive: [Members.invite in the app](../../../application/app-api-docs.html#/rpc/Members/invite).

## Parameters

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `email` | `string` | yes | Where the invitation goes. |
| `role` | `Role` | no | What they may do, member by default. |

## Returns

`Member` - The invited member.

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string"
    },
    "email": {
      "type": "string"
    },
    "role": {
      "enum": [
        "admin",
        "member",
        "guest"
      ]
    },
    "invited": {
      "type": "boolean",
      "description": "Invited members have not accepted yet."
    }
  },
  "required": [
    "id",
    "email",
    "role",
    "invited"
  ]
}
```

## Throws

- RpcError when the email is not an address or is already a member

## Call it

```ts
import { getRpcClient } from "defuss-rpc/client";
import type { RpcApi } from "./api";

const rpc = await getRpcClient<RpcApi>("http://localhost:63920");
const result = await rpc.Members.invite("lin@acme.example");
```

```bash
curl http://localhost:63920/rpc \
  -H "Content-Type: application/json" \
  -d '{"className":"Members","methodName":"invite","args":["lin@acme.example"]}'
```
