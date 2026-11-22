# Tasks

The tasks of the workspace. A class: the server makes a fresh instance for every call.

A class: the server makes a fresh instance for every call. Interactive: [Tasks in the app](../../application/app-api-docs.html#/rpc/Tasks).

| Method | Signature | Description |
| --- | --- | --- |
| [list](Tasks/list.md) | `async list(filter?: { status?: TaskStatus; assignee?: string; limit?: number; }): Promise<Task[]>` | Lists the tasks, newest first. |
| [get](Tasks/get.md) | `async get(id: string): Promise<Task>` | Retrieves one task. |
| [create](Tasks/create.md) | `async create(input: NewTask): Promise<Task>` | Creates a task in the To do column. |
| [move](Tasks/move.md) | `async move(id: string, status: TaskStatus): Promise<Task>` | Moves a task to another column. |
| [remove](Tasks/remove.md) | `async remove(id: string): Promise<boolean>` | Deletes a task. |
