# Acme API reference

Every page of the API Documentation scaffold as Markdown (and as JSON beside it): the REST reference, then the defuss-rpc reference generated from the API's source.

## REST API

- [Introduction](guides/introduction.md)
- [Authentication](guides/authentication.md)
- [Errors](guides/errors.md)
- [Pagination](guides/pagination.md)
- [Rate limits](guides/rate-limits.md)
- [Tasks](ref/tasks.md)
- [List tasks](ref/tasks/list.md)
- [Create a task](ref/tasks/create.md)
- [Retrieve a task](ref/tasks/retrieve.md)
- [Update a task](ref/tasks/update.md)
- [Delete a task](ref/tasks/delete.md)
- [Docs](ref/docs.md)
- [List docs](ref/docs/list.md)
- [Create a doc](ref/docs/create.md)
- [Retrieve a doc](ref/docs/retrieve.md)
- [Members](ref/members.md)
- [List members](ref/members/list.md)
- [Invite a member](ref/members/invite.md)
- [Webhooks](ref/webhooks.md)
- [List webhooks](ref/webhooks/list.md)
- [Create a webhook](ref/webhooks/create.md)
- [Delete a webhook](ref/webhooks/delete.md)

## defuss-rpc API

- [defuss-rpc API](rpc/index.md)
- [Tasks](rpc/Tasks.md)
- [Tasks.list](rpc/Tasks/list.md) - `async list(filter?: { status?: TaskStatus; assignee?: string; limit?: number; }): Promise<Task[]>`
- [Tasks.get](rpc/Tasks/get.md) - `async get(id: string): Promise<Task>`
- [Tasks.create](rpc/Tasks/create.md) - `async create(input: NewTask): Promise<Task>`
- [Tasks.move](rpc/Tasks/move.md) - `async move(id: string, status: TaskStatus): Promise<Task>`
- [Tasks.remove](rpc/Tasks/remove.md) - `async remove(id: string): Promise<boolean>`
- [Members](rpc/Members.md)
- [Members.list](rpc/Members/list.md) - `async list(role?: Role | undefined): Promise<Member[]>`
- [Members.invite](rpc/Members/invite.md) - `async invite(email: string, role?: Role): Promise<Member>`
- [Activity](rpc/Activity.md)
- [Activity.recent](rpc/Activity/recent.md) - `async *recent(count?: number): AsyncGenerator<ActivityEvent, number>`
- [Stats](rpc/Stats.md)
- [Stats.summary](rpc/Stats/summary.md) - `async summary(): Promise<{ byStatus: Record<TaskStatus, number>; byAssignee: Map<string, number>; at: Date; }>`
