# Activity

What happens in the workspace, as a stream.

A module: one object, shared by every call. Interactive: [Activity in the app](../../application/app-api-docs.html#/rpc/Activity).

| Method | Signature | Description |
| --- | --- | --- |
| [recent](Activity/recent.md) | `async *recent(count?: number): AsyncGenerator<ActivityEvent, number>` | Streams the latest changes, oldest first - an async generator: the client receives each event as it is sent. |
