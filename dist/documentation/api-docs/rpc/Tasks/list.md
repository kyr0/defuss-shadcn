# Tasks.list

```ts
async list(filter?: { status?: TaskStatus; assignee?: string; limit?: number; }): Promise<Task[]>
```

Lists the tasks, newest first.

Answers once. Interactive: [Tasks.list in the app](../../../application/app-api-docs.html#/rpc/Tasks/list).

## Parameters

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `filter` | `{ status?: TaskStatus; assignee?: string; limit?: number; }` | no | Only the tasks that match every given field. |

## Returns

`Task[]` - The matching tasks, at most `filter.limit` (default 20).

```json
{
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "description": "Its id, `t_` and a number."
      },
      "title": {
        "type": "string",
        "description": "What has to be done."
      },
      "status": {
        "enum": [
          "todo",
          "doing",
          "done"
        ]
      },
      "assignee": {
        "type": "string",
        "description": "The member it is assigned to, by id."
      },
      "due": {
        "type": "string",
        "format": "date-time",
        "x-dson": "date",
        "description": "When it is due."
      },
      "labels": {
        "type": "array",
        "uniqueItems": true,
        "x-dson": "set",
        "items": {
          "type": "string"
        },
        "description": "Labels, each at most once."
      },
      "created": {
        "type": "string",
        "format": "date-time",
        "x-dson": "date"
      }
    },
    "required": [
      "id",
      "title",
      "status",
      "labels",
      "created"
    ]
  }
}
```

## Examples

```ts
await rpc.Tasks.list({ status: "todo" })
```

## Call it

```ts
import { getRpcClient } from "defuss-rpc/client";
import type { RpcApi } from "./api";

const rpc = await getRpcClient<RpcApi>("http://localhost:63920");
const result = await rpc.Tasks.list();
```

```bash
curl http://localhost:63920/rpc \
  -H "Content-Type: application/json" \
  -d '{"className":"Tasks","methodName":"list","args":[]}'
```
