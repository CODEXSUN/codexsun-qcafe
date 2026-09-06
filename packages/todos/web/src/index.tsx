import { CheckSquare } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@codexsun/ui/components/button";
import { Input } from "@codexsun/ui/components/ui/input";
import type { MdiWorkspaceAddon } from "@codexsun/ui-desk";

type Todo = { id: string; title: string; dueOn: string; completedAt?: string };
type TodoView = "today" | "upcoming" | "completed";
const storageKey = "codexsun.todos.v1";

export const todosWorkspaceAddon: MdiWorkspaceAddon = {
  id: "todos", label: "Today", icon: CheckSquare, placement: "secondary",
  navigation: { id: "todos", hideSearch: true, groups: [{ id: "todos", title: "Today", items: [{ id: "today", title: "Today" }, { id: "upcoming", title: "Upcoming" }, { id: "completed", title: "Completed" }] }] },
  renderPage: (pageId) => <TodosWorkspace initialView={isView(pageId) ? pageId : "today"} />,
};

function TodosWorkspace({ initialView }: { initialView: TodoView }) {
  const [todos, setTodos] = useState<Todo[]>(readTodos);
  const [title, setTitle] = useState("");
  const [view, setView] = useState<TodoView>(initialView);
  useEffect(() => setView(initialView), [initialView]);
  useEffect(() => localStorage.setItem(storageKey, JSON.stringify(todos)), [todos]);
  const today = day();
  const rows = useMemo(() => todos.filter((todo) => view === "completed" ? Boolean(todo.completedAt) : !todo.completedAt && (view === "today" ? todo.dueOn <= today : todo.dueOn > today)).sort((a, b) => a.dueOn.localeCompare(b.dueOn)), [todos, today, view]);
  function add(event: React.FormEvent) { event.preventDefault(); const text = title.trim(); if (!text) return; setTodos((items) => [{ id: crypto.randomUUID(), title: text, dueOn: today }, ...items]); setTitle(""); }
  function toggle(id: string) { setTodos((items) => items.map((todo) => todo.id === id ? { ...todo, completedAt: todo.completedAt ? undefined : new Date().toISOString() } : todo)); }
  return <section className="mx-auto flex h-full max-w-3xl flex-col bg-background px-6 py-8 text-foreground"><header className="mb-8 border-b border-border pb-5"><p className="text-xs font-semibold uppercase tracking-[.16em] text-muted-foreground">Personal work log</p><h1 className="mt-2 text-2xl font-semibold">{view === "today" ? "Today" : view === "upcoming" ? "Upcoming" : "Completed"}</h1><p className="mt-2 text-sm text-muted-foreground">A simple record of what you finish. No planning workflow or project is required.</p></header><form className="flex gap-2" onSubmit={add}><Input aria-label="New todo" className="h-11" onChange={(event) => setTitle(event.target.value)} placeholder="Add something to finish today" value={title} /><Button className="h-11 cursor-pointer" disabled={!title.trim()}>Add</Button></form><div className="mt-6 divide-y divide-border border-y border-border">{rows.length ? rows.map((todo) => <label className="flex cursor-pointer items-center gap-3 py-4" key={todo.id}><input checked={Boolean(todo.completedAt)} className="size-4 accent-foreground" onChange={() => toggle(todo.id)} type="checkbox" /><span className={todo.completedAt ? "text-sm text-muted-foreground line-through" : "text-sm"}>{todo.title}</span><time className="ml-auto text-xs text-muted-foreground">{todo.completedAt ? "Done today" : todo.dueOn === today ? "Today" : todo.dueOn}</time></label>) : <p className="py-10 text-center text-sm text-muted-foreground">Nothing here yet.</p>}</div></section>;
}
function readTodos(): Todo[] {
  try {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return [currentPriority()];
    const value = JSON.parse(saved);
    return Array.isArray(value) ? value.filter(validTodo) : [currentPriority()];
  } catch { return [currentPriority()]; }
}
function currentPriority(): Todo { return { id: "connect-zxa-codex", title: "Connect Codex to ZXA with device authorization and verify a prompt response", dueOn: day() }; }
function validTodo(value: unknown): value is Todo { return typeof value === "object" && value !== null && typeof (value as Todo).id === "string" && typeof (value as Todo).title === "string" && typeof (value as Todo).dueOn === "string"; }
function day() { return new Date().toISOString().slice(0, 10); }
function isView(value: string): value is TodoView { return ["today", "upcoming", "completed"].includes(value); }


