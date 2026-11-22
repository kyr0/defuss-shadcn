/**
 * The API Documentation scaffold's defuss-rpc example: the Acme workspace (tasks, members, activity) as a defuss-rpc
 * API, documented with JSDoc. `bunx defuss-rpc schema` reads this file through server.ts and writes rpc.docs.json,
 * from which the scaffold and the static pages (api-docs/rpc/...) are made; server.ts serves it, and the scaffold's
 * bundle (js/api-docs/client.js) runs the same module in the page when no server is reachable.
 *
 * VERIFIED: (scaffold-api-docs.e2e calls both) why one module for both - the in-page mock and the real server cannot answer differently - a call from Try it gets
 * the answer the server would give. The data lives in this module and starts from the same seed on every load.
 */

/** Where a task stands. */
export type TaskStatus = 'todo' | 'doing' | 'done';
/** What a member may do in the workspace. */
export type Role = 'admin' | 'member' | 'guest';

/** A task of the workspace. */
export interface Task {
  /** Its id, `t_` and a number. */
  id: string;
  /** What has to be done. */
  title: string;
  status: TaskStatus;
  /** The member it is assigned to, by id. */
  assignee?: string;
  /** When it is due. */
  due?: Date;
  /** Labels, each at most once. */
  labels: Set<string>;
  created: Date;
}

/** What creating a task takes. */
export interface NewTask {
  title: string;
  assignee?: string;
  due?: Date;
  labels?: string[];
}

/** A member of the workspace. */
export interface Member {
  id: string;
  email: string;
  role: Role;
  /** Invited members have not accepted yet. */
  invited: boolean;
}

/** One change to a task, as the activity stream sends it. */
export interface ActivityEvent {
  task: string;
  /** What happened: created, moved, assigned or done. */
  kind: 'created' | 'moved' | 'assigned' | 'done';
  at: Date;
  by: string;
}

/** An error a call answers with; defuss-rpc sends its message to the client. */
export class RpcError extends Error {}

const day = (d: number) => new Date(Date.UTC(2026, 10, d, 9, 0, 0));
const seed = () => ({
  tasks: [
    { id: 't_101', title: 'Draft the Q1 roadmap', status: 'doing', assignee: 'm_1', due: day(28), labels: new Set(['planning']), created: day(2) },
    { id: 't_102', title: 'Review the onboarding flow', status: 'todo', assignee: 'm_2', labels: new Set(['ux']), created: day(4) },
    { id: 't_103', title: 'Ship the billing export', status: 'done', assignee: 'm_1', labels: new Set(['billing', 'release']), created: day(6) },
    { id: 't_104', title: 'Rotate the API keys', status: 'todo', labels: new Set(['security']), created: day(9) },
  ] as Task[],
  members: [
    { id: 'm_1', email: 'ada@acme.example', role: 'admin', invited: false },
    { id: 'm_2', email: 'grace@acme.example', role: 'member', invited: false },
    { id: 'm_3', email: 'alan@acme.example', role: 'guest', invited: true },
  ] as Member[],
  next: { task: 105, member: 4 },
});
let db = seed();

const task = (id: string) => {
  const found = db.tasks.find((t) => t.id === id);
  if (!found) throw new RpcError(`No task with the id ${id}`);
  return found;
};
const copy = <T>(value: T): T => structuredClone(value);

/** The tasks of the workspace. A class: the server makes a fresh instance for every call. */
export class Tasks {
  /**
   * Lists the tasks, newest first.
   * @param filter - Only the tasks that match every given field.
   * @returns The matching tasks, at most `filter.limit` (default 20).
   * @example
   * await rpc.Tasks.list({ status: "todo" })
   */
  async list(filter: { status?: TaskStatus; assignee?: string; limit?: number } = {}): Promise<Task[]> {
    return copy(
      db.tasks
        .filter((t) => (!filter.status || t.status === filter.status) && (!filter.assignee || t.assignee === filter.assignee))
        .sort((a, b) => b.created.getTime() - a.created.getTime())
        .slice(0, filter.limit ?? 20),
    );
  }

  /**
   * Retrieves one task.
   * @param id - The task's id.
   * @returns The task.
   * @throws RpcError when there is no task with that id
   */
  async get(id: string): Promise<Task> {
    return copy(task(id));
  }

  /**
   * Creates a task in the To do column.
   * @param input - Its title and, optionally, who does it, when it is due and its labels.
   * @returns The new task, with its id.
   * @throws RpcError when the title is empty
   * @example
   * await rpc.Tasks.create({ title: "Write the release notes", labels: ["release"] })
   */
  async create(input: NewTask): Promise<Task> {
    if (!input?.title?.trim()) throw new RpcError('A task needs a title');
    const created: Task = {
      id: `t_${db.next.task++}`,
      title: input.title.trim(),
      status: 'todo',
      ...(input.assignee ? { assignee: input.assignee } : {}),
      ...(input.due ? { due: new Date(input.due) } : {}),
      labels: new Set(input.labels ?? []),
      created: new Date(),
    };
    db.tasks.push(created);
    return copy(created);
  }

  /**
   * Moves a task to another column.
   * @param id - The task's id.
   * @param status - Where it goes.
   * @returns The task as it is now.
   * @throws RpcError when there is no task with that id
   */
  async move(id: string, status: TaskStatus): Promise<Task> {
    const t = task(id);
    t.status = status;
    return copy(t);
  }

  /**
   * Deletes a task.
   * @param id - The task's id.
   * @returns True when a task was deleted, false when there was none.
   */
  async remove(id: string): Promise<boolean> {
    const before = db.tasks.length;
    db.tasks = db.tasks.filter((t) => t.id !== id);
    return db.tasks.length < before;
  }
}

/** The people in the workspace. A module: one shared object. */
export const Members = {
  /**
   * Lists the members.
   * @param role - Only the members with this role.
   * @returns The members, in the order they joined.
   */
  async list(role?: Role): Promise<Member[]> {
    return copy(db.members.filter((m) => !role || m.role === role));
  },

  /**
   * Invites someone by email; they stay invited until they accept.
   * @param email - Where the invitation goes.
   * @param role - What they may do, member by default.
   * @returns The invited member.
   * @throws RpcError when the email is not an address or is already a member
   */
  async invite(email: string, role: Role = 'member'): Promise<Member> {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email ?? '')) throw new RpcError(`Not an email address: ${email}`);
    if (db.members.some((m) => m.email === email)) throw new RpcError(`${email} is already a member`);
    const member: Member = { id: `m_${db.next.member++}`, email, role, invited: true };
    db.members.push(member);
    return copy(member);
  },
};

/** What happens in the workspace, as a stream. */
export const Activity = {
  /**
   * Streams the latest changes, oldest first - an async generator: the client receives each event as it is sent.
   * @param count - How many events to send.
   * @yields One change to a task.
   * @returns How many events were sent.
   */
  async *recent(count = 4): AsyncGenerator<ActivityEvent, number> {
    const events = db.tasks
      .flatMap((t): ActivityEvent[] => [
        { task: t.id, kind: 'created', at: t.created, by: t.assignee ?? 'm_1' },
        ...(t.status === 'done' ? [{ task: t.id, kind: 'done' as const, at: new Date(t.created.getTime() + 864e5), by: t.assignee ?? 'm_1' }] : []),
      ])
      .sort((a, b) => a.at.getTime() - b.at.getTime())
      .slice(-count);
    for (const event of events) {
      await new Promise((resolve) => setTimeout(resolve, 60));
      yield copy(event);
    }
    return events.length;
  },
};

/** Figures about the workspace. */
export const Stats = {
  /**
   * Counts the tasks per column and per assignee.
   * @returns A Map per assignee and the time of the count - DSON keeps both types on the way to the client.
   */
  async summary(): Promise<{ byStatus: Record<TaskStatus, number>; byAssignee: Map<string, number>; at: Date }> {
    const byStatus: Record<TaskStatus, number> = { todo: 0, doing: 0, done: 0 };
    const byAssignee = new Map<string, number>();
    for (const t of db.tasks) {
      byStatus[t.status]++;
      if (t.assignee) byAssignee.set(t.assignee, (byAssignee.get(t.assignee) ?? 0) + 1);
    }
    return { byStatus, byAssignee, at: new Date() };
  },
};

/** Starts the data over from its seed (the scaffold's Reset; not part of the API). */
export function resetExample(): void {
  db = seed();
}

const RpcApi = { Tasks, Members, Activity, Stats };
export default RpcApi;
export type RpcApi = typeof RpcApi;
