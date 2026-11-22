# Activity.recent

```ts
async *recent(count?: number): AsyncGenerator<ActivityEvent, number>
```

Streams the latest changes, oldest first - an async generator: the client receives each event as it is sent.

Streams: every `yield` arrives as one NDJSON frame, then the return value. Interactive: [Activity.recent in the app](../../../application/app-api-docs.html#/rpc/Activity/recent).

## Parameters

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `count` | `number` | no | How many events to send. |

## Yields

`ActivityEvent` - One change to a task.

```json
{
  "type": "object",
  "properties": {
    "task": {
      "type": "string"
    },
    "kind": {
      "enum": [
        "done",
        "created",
        "moved",
        "assigned"
      ],
      "description": "What happened: created, moved, assigned or done."
    },
    "at": {
      "type": "string",
      "format": "date-time",
      "x-dson": "date"
    },
    "by": {
      "type": "string"
    }
  },
  "required": [
    "task",
    "kind",
    "at",
    "by"
  ]
}
```

## Returns

`number` - How many events were sent.

```json
{
  "type": "number"
}
```

## Call it

```ts
import { getRpcClient } from "defuss-rpc/client";
import type { RpcApi } from "./api";

const rpc = await getRpcClient<RpcApi>("http://localhost:63920");
for await (const value of rpc.Activity.recent()) console.log(value);
```

```bash
curl http://localhost:63920/rpc \
  -H "Content-Type: application/json" \
  -d '{"className":"Activity","methodName":"recent","args":[]}'
```
