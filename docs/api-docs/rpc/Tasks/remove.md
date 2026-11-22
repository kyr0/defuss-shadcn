# Tasks.remove

```ts
async remove(id: string): Promise<boolean>
```

Deletes a task.

Answers once. Interactive: [Tasks.remove in the app](../../../application/app-api-docs.html#/rpc/Tasks/remove).

## Parameters

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | `string` | yes | The task's id. |

## Returns

`boolean` - True when a task was deleted, false when there was none.

```json
{
  "type": "boolean"
}
```

## Call it

```ts
import { getRpcClient } from "defuss-rpc/client";
import type { RpcApi } from "./api";

const rpc = await getRpcClient<RpcApi>("http://localhost:63920");
const result = await rpc.Tasks.remove("t_101");
```

```bash
curl http://localhost:63920/rpc \
  -H "Content-Type: application/json" \
  -d '{"className":"Tasks","methodName":"remove","args":["t_101"]}'
```
