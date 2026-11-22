# Stats

Figures about the workspace.

A module: one object, shared by every call. Interactive: [Stats in the app](../../application/app-api-docs.html#/rpc/Stats).

| Method | Signature | Description |
| --- | --- | --- |
| [summary](Stats/summary.md) | `async summary(): Promise<{ byStatus: Record<TaskStatus, number>; byAssignee: Map<string, number>; at: Date; }>` | Counts the tasks per column and per assignee. |
