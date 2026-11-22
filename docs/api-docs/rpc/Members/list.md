# Members.list

```ts
async list(role?: Role | undefined): Promise<Member[]>
```

Lists the members.

Answers once. Interactive: [Members.list in the app](../../../application/app-api-docs.html#/rpc/Members/list).

## Parameters

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `role` | `Role | undefined` | no | Only the members with this role. |

## Returns

`Member[]` - The members, in the order they joined.

```json
{
  "type": "array",
  "items": {
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
}
```

## Call it

```ts
import { getRpcClient } from "defuss-rpc/client";
import type { RpcApi } from "./api";

const rpc = await getRpcClient<RpcApi>("http://localhost:63920");
const result = await rpc.Members.list();
```

```bash
curl http://localhost:63920/rpc \
  -H "Content-Type: application/json" \
  -d '{"className":"Members","methodName":"list","args":[]}'
```
