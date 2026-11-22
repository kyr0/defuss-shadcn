# defuss-rpc API

The Acme workspace as a [defuss-rpc](https://github.com/kyr0/defuss-rpc) API. Every call is one `POST /rpc` with `{ className, methodName, args }`; arguments and results travel as DSON, so a `Date`, a `Map` or a `Set` arrives as itself, and an async generator streams one NDJSON frame per value. This reference was written by `defuss-rpc schema` from the API's source and its JSDoc.

Interactive: [the API Documentation app](../../application/app-api-docs.html#/rpc).

| Namespace | Kind | Methods | Description |
| --- | --- | --- | --- |
| [Tasks](Tasks.md) | class | 5 | The tasks of the workspace. A class: the server makes a fresh instance for every call. |
| [Members](Members.md) | module | 2 | The people in the workspace. A module: one shared object. |
| [Activity](Activity.md) | module | 1 | What happens in the workspace, as a stream. |
| [Stats](Stats.md) | module | 1 | Figures about the workspace. |
