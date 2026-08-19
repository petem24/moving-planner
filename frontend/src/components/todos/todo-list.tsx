import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CalendarDays, Check, Pencil, Plus, Trash2 } from "lucide-react";
import { useMutation, useQuery } from "convex/react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { api } from "../../../../backend/convex/_generated/api";
import type { Doc } from "../../../../backend/convex/_generated/dataModel";

type TodoStatus = "incomplete" | "complete";
type TodoPriority = "low" | "medium" | "high";
type TodoSort = "createdAt" | "dueDate" | "priority";

type TodoRecord = {
  id: string;
  title: string;
  description?: string;
  priority: TodoPriority;
  status: TodoStatus;
  dueDate?: string;
  createdAt: number;
  updatedAt: number;
};

type TodoValues = {
  title: string;
  description?: string;
  priority: TodoPriority;
  status: TodoStatus;
  dueDate?: string;
};

type TodoListProps = {
  enabled: boolean;
};

type TodoBoardProps = {
  todos: TodoRecord[] | undefined;
  onCreate: (values: TodoValues) => Promise<void>;
  onUpdate: (id: string, values: TodoValues) => Promise<void>;
  onSetStatus: (id: string, status: TodoStatus) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

type EditorState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; todo: TodoRecord };

const priorityLabels: Record<TodoPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

const priorityOrder: Record<TodoPriority, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

const dueDateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
});

/* Matches the focus treatment in @/components/ui/button, so fields and buttons
   ring identically. */
const inputClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-shadow placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function TodoList({ enabled }: TodoListProps) {
  if (!enabled) {
    return <TodoListUnavailable />;
  }

  return <ConnectedTodoList />;
}

function ConnectedTodoList() {
  const todos = useQuery(api.todos.list);
  const createTodo = useMutation(api.todos.create);
  const updateTodo = useMutation(api.todos.update);
  const setStatus = useMutation(api.todos.setStatus);
  const removeTodo = useMutation(api.todos.remove);

  const records = todos?.map(todoFromDoc);

  return (
    <TodoBoard
      onCreate={async (values) => {
        await createTodo({
          title: values.title,
          description: values.description,
          priority: values.priority,
          dueDate: values.dueDate,
        });
      }}
      onDelete={async (id) => {
        await removeTodo({ id: id as Doc<"todos">["_id"] });
      }}
      onSetStatus={async (id, status) => {
        await setStatus({ id: id as Doc<"todos">["_id"], status });
      }}
      onUpdate={async (id, values) => {
        await updateTodo({ id: id as Doc<"todos">["_id"], ...values });
      }}
      todos={records}
    />
  );
}

function TodoListUnavailable() {
  return (
    <section className="flex flex-col gap-4" aria-labelledby="todo-heading">
      <h2 className="font-display text-display-xs" id="todo-heading">
        Todo
      </h2>
      <p className="text-sm text-muted-foreground">
        Set <code className="numeric text-xs">VITE_CONVEX_URL</code> to start adding tasks.
      </p>
    </section>
  );
}

function TodoBoard({
  todos,
  onCreate,
  onUpdate,
  onSetStatus,
  onDelete,
}: TodoBoardProps) {
  const [editor, setEditor] = useState<EditorState>({ mode: "closed" });
  const [filter, setFilter] = useState<TodoStatus>("incomplete");
  const [sort, setSort] = useState<TodoSort>("createdAt");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visibleTodos = useMemo(() => {
    if (!todos) return undefined;

    return todos
      .filter((todo) => todo.status === filter)
      .sort((first, second) => compareTodos(first, second, sort));
  }, [filter, sort, todos]);

  const openCreate = () => {
    setError(null);
    setEditor({ mode: "create" });
  };

  const openEdit = (todo: TodoRecord) => {
    setError(null);
    setEditor({ mode: "edit", todo });
  };

  const closeEditor = () => {
    if (isSaving) return;
    setError(null);
    setEditor({ mode: "closed" });
  };

  const saveTodo = async (values: TodoValues) => {
    setError(null);
    setIsSaving(true);

    try {
      if (editor.mode === "edit") {
        await onUpdate(editor.todo.id, values);
      } else {
        await onCreate({ ...values, status: "incomplete" });
      }
      setEditor({ mode: "closed" });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save this task");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStatus = async (todo: TodoRecord) => {
    setError(null);

    try {
      await onSetStatus(todo.id, todo.status === "complete" ? "incomplete" : "complete");
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Unable to update this task");
    }
  };

  const deleteTodo = async (todo: TodoRecord) => {
    if (!window.confirm(`Delete “${todo.title}”?`)) return;

    setError(null);

    try {
      await onDelete(todo.id);
      if (editor.mode === "edit" && editor.todo.id === todo.id) {
        setEditor({ mode: "closed" });
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete this task");
    }
  };

  const incompleteCount = todos?.filter((todo) => todo.status === "incomplete").length ?? 0;
  const completeCount = todos?.filter((todo) => todo.status === "complete").length ?? 0;

  return (
    <section className="flex flex-col gap-6" aria-labelledby="todo-heading">
      <header className="flex flex-wrap items-baseline justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <h2 className="font-display text-display-xs" id="todo-heading">
            Todo
          </h2>
        </div>
        {editor.mode === "closed" && (
          <Button size="sm" variant="ghost" onClick={openCreate}>
            <Plus />
            New task
          </Button>
        )}
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex w-fit rounded-lg bg-muted p-1" role="group" aria-label="Filter tasks">
          <FilterTab
            count={incompleteCount}
            label="Incomplete"
            selected={filter === "incomplete"}
            onClick={() => setFilter("incomplete")}
          />
          <FilterTab
            count={completeCount}
            label="Complete"
            selected={filter === "complete"}
            onClick={() => setFilter("complete")}
          />
        </div>

        <label
          className="flex shrink-0 items-center gap-2 text-xs whitespace-nowrap text-muted-foreground"
          htmlFor="todo-sort"
        >
          Order by
          <select
            className={cn(inputClass, "h-8 w-auto min-w-36 py-1 text-xs")}
            id="todo-sort"
            onChange={(event) => setSort(event.target.value as TodoSort)}
            value={sort}
          >
            <option value="createdAt">Date created</option>
            <option value="dueDate">Date due</option>
            <option value="priority">Priority</option>
          </select>
        </label>
      </div>

      {editor.mode !== "closed" && (
        <TodoEditor
          error={error}
          isSaving={isSaving}
          todo={editor.mode === "edit" ? editor.todo : undefined}
          onCancel={closeEditor}
          onSave={saveTodo}
        />
      )}

      {visibleTodos === undefined ? (
        <p className="text-sm text-muted-foreground">Loading tasks…</p>
      ) : visibleTodos.length === 0 ? (
        <button
          className="rounded-xl border border-dashed border-border px-5 py-10 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
          onClick={openCreate}
          type="button"
        >
          {filter === "incomplete" ? "Nothing to do yet — add the first task" : "No completed tasks yet"}
        </button>
      ) : (
        <div className="flex flex-col gap-3">
          {visibleTodos.map((todo) => (
            <TodoCard key={todo.id} todo={todo} onDelete={deleteTodo} onEdit={openEdit} onToggle={toggleStatus} />
          ))}
        </div>
      )}

      {error && editor.mode === "closed" && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

function FilterTab({
  count,
  label,
  selected,
  onClick,
}: {
  count: number;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={selected}
      className={cn(
        "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
        selected ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
      )}
      onClick={onClick}
      type="button"
    >
      {label}
      <span className="numeric ml-1.5 text-[0.7rem] opacity-60">{count}</span>
    </button>
  );
}

function TodoEditor({
  todo,
  isSaving,
  error,
  onSave,
  onCancel,
}: {
  todo?: TodoRecord;
  isSaving: boolean;
  error: string | null;
  onSave: (values: TodoValues) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(todo?.title ?? "");
  const [description, setDescription] = useState(todo?.description ?? "");
  const [priority, setPriority] = useState<TodoPriority>(todo?.priority ?? "medium");
  const [status, setStatus] = useState<TodoStatus>(todo?.status ?? "incomplete");
  const [dueDate, setDueDate] = useState(todo?.dueDate ?? "");

  useEffect(() => {
    setTitle(todo?.title ?? "");
    setDescription(todo?.description ?? "");
    setPriority(todo?.priority ?? "medium");
    setStatus(todo?.status ?? "incomplete");
    setDueDate(todo?.dueDate ?? "");
  }, [todo]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSave({
      title,
      description: description.trim() || undefined,
      priority,
      status,
      dueDate: dueDate || undefined,
    });
  };

  return (
    <form className="rounded-xl bg-card p-5 shadow-sm ring-1 ring-border" onSubmit={handleSubmit}>
      <div className="grid gap-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium" htmlFor="todo-title">
            Title
          </label>
          <input
            autoFocus
            className={inputClass}
            id="todo-title"
            maxLength={120}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Book the movers"
            required
            value={title}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium" htmlFor="todo-description">
            Description <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <textarea
            className={cn(inputClass, "min-h-20 resize-y")}
            id="todo-description"
            maxLength={2_000}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Add any useful details"
            value={description}
          />
        </div>

        <div className={cn("grid gap-4", todo ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
          <div>
            <label className="mb-1.5 block text-xs font-medium" htmlFor="todo-priority">
              Priority
            </label>
            <select
              className={inputClass}
              id="todo-priority"
              onChange={(event) => setPriority(event.target.value as TodoPriority)}
              value={priority}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          {todo && (
            <div>
              <label className="mb-1.5 block text-xs font-medium" htmlFor="todo-status">
                Status
              </label>
              <select
                className={inputClass}
                id="todo-status"
                onChange={(event) => setStatus(event.target.value as TodoStatus)}
                value={status}
              >
                <option value="incomplete">Incomplete</option>
                <option value="complete">Complete</option>
              </select>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium" htmlFor="todo-due-date">
              Due date <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <input
              className={inputClass}
              id="todo-due-date"
              onChange={(event) => setDueDate(event.target.value)}
              type="date"
              value={dueDate}
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <Button disabled={isSaving} type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button disabled={isSaving} type="submit">
          {isSaving ? "Saving…" : todo ? "Save changes" : "Add task"}
        </Button>
      </div>
    </form>
  );
}

function TodoCard({
  todo,
  onEdit,
  onDelete,
  onToggle,
}: {
  todo: TodoRecord;
  onEdit: (todo: TodoRecord) => void;
  onDelete: (todo: TodoRecord) => void;
  onToggle: (todo: TodoRecord) => void;
}) {
  const completed = todo.status === "complete";
  const overdue = Boolean(todo.dueDate && !completed && todo.dueDate < toDateInputValue(new Date()));

  return (
    <article
      className={cn(
        "group flex gap-3 rounded-xl bg-card p-4 shadow-sm ring-1 ring-border transition-shadow hover:shadow-md",
        completed && "opacity-70",
      )}
    >
      <label className="mt-0.5 shrink-0" title={completed ? "Mark incomplete" : "Mark complete"}>
        <input
          aria-label={`Mark ${todo.title} ${completed ? "incomplete" : "complete"}`}
          checked={completed}
          className="peer sr-only"
          onChange={() => onToggle(todo)}
          type="checkbox"
        />
        {/* `border-border` all but vanishes on the dark card, so the ring is drawn
            from the muted foreground instead. */}
        <span className="grid size-5 cursor-pointer place-items-center rounded-full border border-muted-foreground/50 text-transparent transition-colors hover:border-primary peer-focus-visible:ring-3 peer-focus-visible:ring-ring/40 peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground">
          <Check className="size-3" strokeWidth={3} />
        </span>
      </label>

      <div className="min-w-0 flex-1">
        {/* Title and priority read as one unit rather than being pinned to
            opposite edges of the card. */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className={cn("text-sm font-medium", completed && "text-muted-foreground line-through")}>
            {todo.title}
          </h3>
          <Badge variant={priorityVariant(todo.priority)}>{priorityLabels[todo.priority]}</Badge>
        </div>

        {todo.description && (
          <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {todo.description}
          </p>
        )}

        <footer className="mt-3 flex min-h-6 flex-wrap items-center justify-between gap-2">
          {/* Only the due date earns a line here — "created" is on every card and
              tells you nothing you can act on. */}
          {todo.dueDate ? (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-xs",
                overdue ? "text-destructive" : "text-muted-foreground",
              )}
            >
              <CalendarDays className="size-3.5" />
              {overdue ? "Overdue · " : "Due "}
              {formatDueDate(todo.dueDate)}
            </span>
          ) : (
            <span />
          )}

          <div className="flex gap-1 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:focus-within:opacity-100">
            <Button aria-label={`Edit ${todo.title}`} size="icon-xs" variant="ghost" onClick={() => onEdit(todo)}>
              <Pencil />
            </Button>
            <Button aria-label={`Delete ${todo.title}`} size="icon-xs" variant="ghost" onClick={() => onDelete(todo)}>
              <Trash2 />
            </Button>
          </div>
        </footer>
      </div>
    </article>
  );
}

function todoFromDoc(todo: Doc<"todos">): TodoRecord {
  return {
    id: todo._id,
    title: todo.title,
    description: todo.description,
    priority: todo.priority,
    status: todo.status,
    dueDate: todo.dueDate,
    createdAt: todo.createdAt,
    updatedAt: todo.updatedAt,
  };
}

function compareTodos(first: TodoRecord, second: TodoRecord, sort: TodoSort) {
  if (sort === "priority") {
    return priorityOrder[second.priority] - priorityOrder[first.priority] || second.createdAt - first.createdAt;
  }

  if (sort === "dueDate") {
    if (!first.dueDate && !second.dueDate) return second.createdAt - first.createdAt;
    if (!first.dueDate) return 1;
    if (!second.dueDate) return -1;
    return first.dueDate.localeCompare(second.dueDate) || second.createdAt - first.createdAt;
  }

  return second.createdAt - first.createdAt;
}

/** Red is reserved for overdue, so priority steps down through warning → neutral
    → outline instead of competing with it. */
function priorityVariant(priority: TodoPriority) {
  if (priority === "high") return "warning" as const;
  if (priority === "medium") return "secondary" as const;
  return "outline" as const;
}

function formatDueDate(value: string) {
  return dueDateFormat.format(new Date(`${value}T12:00:00`));
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
