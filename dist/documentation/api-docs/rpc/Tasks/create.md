# Tasks.create

```ts
async create(input: NewTask): Promise<Task>
```

Creates a task in the To do column.

Answers once. Interactive: [Tasks.create in the app](../../../application/app-api-docs.html#/rpc/Tasks/create).

## Parameters

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `input` | `NewTask` | yes | Its title and, optionally, who does it, when it is due and its labels. |

## Returns

`Task` - The new task, with its id.

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

- RpcError when the title is empty

## Examples

```ts
await rpc.Tasks.create({ title: "Write the release notes", labels: ["release"] })
```

## Call it

```ts
import { getRpcClient } from "defuss-rpc/client";
import type { RpcApi } from "./api";

const rpc = await getRpcClient<RpcApi>("http://localhost:63920");
const result = await rpc.Tasks.create({"title":"Write the release notes"});
```

```bash
curl http://localhost:63920/rpc \
  -H "Content-Type: application/json" \
  -d '{"className":"Tasks","methodName":"create","args":[{"title":"Write the release notes"}]}'
```
