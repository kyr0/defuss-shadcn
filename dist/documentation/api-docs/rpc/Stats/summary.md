# Stats.summary

```ts
async summary(): Promise<{ byStatus: Record<TaskStatus, number>; byAssignee: Map<string, number>; at: Date; }>
```

Counts the tasks per column and per assignee.

Answers once. Interactive: [Stats.summary in the app](../../../application/app-api-docs.html#/rpc/Stats/summary).

This method takes no parameters.

## Returns

`{ byStatus: Record<TaskStatus, number>; byAssignee: Map<string, number>; at: Date; }` - A Map per assignee and the time of the count - DSON keeps both types on the way to the client.

```json
{
  "type": "object",
  "properties": {
    "byStatus": {
      "type": "object",
      "properties": {
        "todo": {},
        "doing": {},
        "done": {}
      },
      "required": [
        "todo",
        "doing",
        "done"
      ]
    },
    "byAssignee": {
      "type": "object",
      "x-dson": "map",
      "additionalProperties": {
        "type": "number"
      }
    },
    "at": {
      "type": "string",
      "format": "date-time",
      "x-dson": "date"
    }
  },
  "required": [
    "byStatus",
    "byAssignee",
    "at"
  ]
}
```

## Call it

```ts
import { getRpcClient } from "defuss-rpc/client";
import type { RpcApi } from "./api";

const rpc = await getRpcClient<RpcApi>("http://localhost:63920");
const result = await rpc.Stats.summary();
```

```bash
curl http://localhost:63920/rpc \
  -H "Content-Type: application/json" \
  -d '{"className":"Stats","methodName":"summary","args":[]}'
```
