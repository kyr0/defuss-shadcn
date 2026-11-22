# Tasks.move

```ts
async move(id: string, status: TaskStatus): Promise<Task>
```

Moves a task to another column.

Answers once. Interactive: [Tasks.move in the app](../../../application/app-api-docs.html#/rpc/Tasks/move).

## Parameters

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | `string` | yes | The task's id. |
| `status` | `TaskStatus` | yes | Where it goes. |

## Returns

`Task` - The task as it is now.

```json
{
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
```

## Throws

- RpcError when there is no task with that id

## Call it

```ts
import { getRpcClient } from "defuss-rpc/client";
import type { RpcApi } from "./api";

const rpc = await getRpcClient<RpcApi>("http://localhost:63920");
const result = await rpc.Tasks.move("t_101", "todo");
```

```bash
curl http://localhost:63920/rpc \
  -H "Content-Type: application/json" \
  -d '{"className":"Tasks","methodName":"move","args":["t_101","todo"]}'
```
