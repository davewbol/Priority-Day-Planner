  import React, { useEffect, useMemo, useState } from "react";

  // Priority Day Planner (Franklin-Covey–style MVP)
  // Drag-and-drop enabled (native HTML5, no extra deps)
  // - Left column: Today Inbox (unprioritized)
  // - Right column: Priority Stack (top = highest priority)
  // - Drag from Inbox → Stack to prioritize; drag within Stack to reorder; drag Stack → Inbox to de‑prioritize
  // - Unfinished items automatically carry over to the next day
  // - LocalStorage persistence kept (retains existing tasks)

  // ----- Helpers -----
  const storageKey = "fc_tasks_v1";
  const lastOpenKey = "fc_last_open_date";

  function todayStr() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function uid() {
    return Math.random().toString(36).slice(2, 10);
  }

  // ----- Types -----
  /** @typedef {{
   *  id: string,
   *  text: string,
   *  createdAt: string, // ISO date
   *  date: string,      // working day the task is assigned for (YYYY-MM-DD)
   *  inStack: boolean,  // true if in Priority Stack
   *  order: number,     // lower = higher (top of stack)
   *  completed: boolean,
   * }} Task */

  // ----- Component -----
  export default function App() {
    const [tasks, setTasks] = useState/** @type {Task[]} */(() => {
      try {
        const raw = localStorage.getItem(storageKey);
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    });
    const [text, setText] = useState("");
    const [simulatedToday, setSimulatedToday] = useState(todayStr());

    // DnD UI state
    const [draggingId, setDraggingId] = useState/** @type {string | null} */(null);
    const [overStackId, setOverStackId] = useState/** @type {string | null} */(null); // item we are hovering over in stack
    const [overInbox, setOverInbox] = useState(false); // whether inbox container is the drop target
    const [overStackList, setOverStackList] = useState(false); // hovering stack list itself

    // On first mount: handle carryover from prior day
    useEffect(() => {
      const storedLast = localStorage.getItem(lastOpenKey);
      const now = todayStr();

      // If day changed, carry over all unfinished tasks
      if (storedLast && storedLast !== now) {
        setTasks(prev => {
          const unfinished = prev.filter(t => !t.completed);
          const finished = prev.filter(t => t.completed);

          // Move unfinished to today (preserve order and inStack)
          const carried = unfinished.map(t => ({ ...t, date: now }));

          return [...carried, ...finished];
        });
      }

      // Always update last open date
      localStorage.setItem(lastOpenKey, now);
      setSimulatedToday(now);
    }, []);

    // Persist tasks whenever they change
    useEffect(() => {
      localStorage.setItem(storageKey, JSON.stringify(tasks));
    }, [tasks]);

    // Derived lists for the active day
    const activeDay = simulatedToday; // could be controlled for testing

    const inbox = useMemo(
      () => tasks.filter(t => t.date === activeDay && !t.inStack && !t.completed),
      [tasks, activeDay]
    );

    const stack = useMemo(() => {
      const list = tasks.filter(t => t.date === activeDay && t.inStack && !t.completed);
      return list.sort((a, b) => a.order - b.order);
    }, [tasks, activeDay]);

    const completedToday = useMemo(
      () => tasks.filter(t => t.date === activeDay && t.completed),
      [tasks, activeDay]
    );

    // ----- Actions -----
    function addTask(e) {
      e.preventDefault();
      const trimmed = text.trim();
      if (!trimmed) return;
      setTasks(prev => [
        ...prev,
        {
          id: uid(),
          text: trimmed,
          createdAt: new Date().toISOString(),
          date: activeDay,
          inStack: false,
          order: Number.MAX_SAFE_INTEGER, // not stacked yet
          completed: false,
        },
      ]);
      setText("");
    }

    function prioritize(id, position = "top", beforeId = null) {
      setTasks(prev => {
        const next = [...prev];
        const st = next.filter(t => t.date === activeDay && t.inStack && !t.completed).sort((a,b)=>a.order-b.order);
        let newOrder = 0;
        if (beforeId) {
          const target = st.find(t => t.id === beforeId);
          newOrder = target ? target.order - 1 : 0;
        } else if (position === "bottom" && st.length) {
          newOrder = st[st.length - 1].order + 1;
        } else if (st.length) {
          newOrder = st[0].order - 1; // top
        }
        return next.map(t => (t.id === id ? { ...t, inStack: true, order: newOrder, date: activeDay } : t));
      });
    }

    function deprioritize(id) {
      setTasks(prev => prev.map(t => (t.id === id ? { ...t, inStack: false, order: Number.MAX_SAFE_INTEGER, date: activeDay } : t)));
    }

    function moveUp(id) {
      setTasks(prev => {
        const list = prev.filter(t => t.date === activeDay && t.inStack && !t.completed).sort((a,b)=>a.order-b.order);
        const idx = list.findIndex(t => t.id === id);
        if (idx <= 0) return prev; // already at top
        const above = list[idx - 1];
        const curr = list[idx];
        return prev.map(t => {
          if (t.id === curr.id) return { ...t, order: above.order - 1 };
          return t;
        });
      });
    }

    function moveDown(id) {
      setTasks(prev => {
        const list = prev.filter(t => t.date === activeDay && t.inStack && !t.completed).sort((a,b)=>a.order-b.order);
        const idx = list.findIndex(t => t.id === id);
        if (idx === -1 || idx === list.length - 1) return prev; // bottom
        const below = list[idx + 1];
        const curr = list[idx];
        return prev.map(t => {
          if (t.id === curr.id) return { ...t, order: below.order + 1 };
          return t;
        });
      });
    }

    function toggleDone(id) {
      setTasks(prev => prev.map(t => (t.id === id ? { ...t, completed: !t.completed } : t)));
    }

    function remove(id) {
      setTasks(prev => prev.filter(t => t.id !== id));
    }

    function rename(id, newText) {
      setTasks(prev => prev.map(t => (t.id === id ? { ...t, text: newText } : t)));
    }

    function simulateNextDay() {
      // For testing carryover: advances the working date by +1 day
      const d = new Date(activeDay + "T00:00:00");
      d.setDate(d.getDate() + 1);
      const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

      // Carry over unfinished
      setTasks(prev => {
        const unfinishedPrevDay = prev.filter(t => t.date === activeDay && !t.completed);
        const other = prev.filter(t => !(t.date === activeDay && !t.completed));
        const carried = unfinishedPrevDay.map(t => ({ ...t, date: next }));
        return [...other, ...carried];
      });
      setSimulatedToday(next);
      localStorage.setItem(lastOpenKey, next);
    }

    // ----- DnD Handlers -----
    function onDragStart(e, task) {
      setDraggingId(task.id);
      e.dataTransfer.effectAllowed = "move";
      // Some browsers need explicit data to enable DnD
      e.dataTransfer.setData("text/plain", task.id);
    }
    function onDragEnd() {
      setDraggingId(null);
      setOverStackId(null);
      setOverInbox(false);
      setOverStackList(false);
    }

    // Inbox drop = de‑prioritize (move from stack back to inbox)
    function handleInboxDragOver(e) {
      e.preventDefault();
      setOverInbox(true);
    }
    function handleInboxDrop(e) {
      e.preventDefault();
      if (!draggingId) return;
      deprioritize(draggingId);
      onDragEnd();
    }

    // Stack list drop = prioritize (to bottom if dropped on empty area)
    function handleStackListDragOver(e) {
      e.preventDefault();
      setOverStackList(true);
      setOverInbox(false);
    }
    function handleStackListDrop(e) {
      e.preventDefault();
      if (!draggingId) return;
      // If not dropped on a specific item, place at bottom
      prioritize(draggingId, "bottom", null);
      onDragEnd();
    }

    // Stack item drop = place before that item
    function handleStackItemDragOver(e, overId) {
      e.preventDefault();
      setOverStackId(overId);
      setOverStackList(true);
      setOverInbox(false);
    }
    function handleStackItemDrop(e, overId) {
      e.preventDefault();
      if (!draggingId) return;
      if (draggingId === overId) return onDragEnd();
      prioritize(draggingId, "before", overId);
      onDragEnd();
    }

    // ----- Item rendering -----
    function TaskRow({ task, location, index }) {
      const [editing, setEditing] = useState(false);
      const [val, setVal] = useState(task.text);

      useEffect(() => setVal(task.text), [task.text]);

      const isDragging = draggingId === task.id;

      return (
        <div
          className={`flex items-center gap-2 p-2 rounded-xl border bg-zinc-900/40 hover:bg-zinc-900 transition ${
            isDragging ? "opacity-60" : ""
          } ${location === "stack" ? "border-zinc-800" : "border-zinc-800"}`}
          draggable
          onDragStart={(e) => onDragStart(e, task)}
          onDragEnd={onDragEnd}
          onDragOver={location === "stack" ? (e) => handleStackItemDragOver(e, task.id) : undefined}
          onDrop={location === "stack" ? (e) => handleStackItemDrop(e, task.id) : undefined}
        >
          <button
            title={task.completed ? "Mark as not done" : "Mark done"}
            onClick={() => toggleDone(task.id)}
            className={`h-5 w-5 rounded border flex items-center justify-center ${task.completed ? "bg-green-600 border-green-600" : "border-zinc-600"}`}
          >
            {task.completed ? "✓" : ""}
          </button>

          {editing ? (
            <input
              className="flex-1 bg-transparent outline-none border-b border-zinc-700 focus:border-zinc-500"
              value={val}
              onChange={e => setVal(e.target.value)}
              onBlur={() => {
                setEditing(false);
                const newText = val.trim();
                if (newText && newText !== task.text) rename(task.id, newText);
                else setVal(task.text);
              }}
              onKeyDown={e => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") {
                  setVal(task.text);
                  setEditing(false);
                }
              }}
              autoFocus
            />
          ) : (
            <span
              className={`flex-1 ${task.completed ? "line-through text-zinc-500" : ""}`}
              onDoubleClick={() => setEditing(true)}
            >
              {task.text}
            </span>
          )}

          <div className="flex items-center gap-1 select-none">
            <span className="px-2 py-1 rounded-lg bg-zinc-800 text-xs">☰</span>
            {location === "inbox" && (
              <button className="px-2 py-1 rounded-lg bg-sky-700 hover:bg-sky-600 text-sm" onClick={() => prioritize(task.id)}>
                → Prioritize
              </button>
            )}
            {location === "stack" && (
              <>
                <button className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm" onClick={() => moveUp(task.id)} title="Move up">↑</button>
                <button className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm" onClick={() => moveDown(task.id)} title="Move down">↓</button>
                <button className="px-2 py-1 rounded-lg bg-indigo-700 hover:bg-indigo-600 text-sm" onClick={() => deprioritize(task.id)}>
                  ← De‑prioritize
                </button>
              </>
            )}
            <button className="px-2 py-1 rounded-lg bg-rose-700 hover:bg-rose-600 text-sm" onClick={() => remove(task.id)}>
              Delete
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen w-full bg-zinc-950 text-zinc-100 p-6">
        <div className="max-w-5xl mx-auto">
          <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold">Priority Day Planner</h1>
              <p className="text-zinc-400">Franklin‑Covey style: stack the few most important, carry the rest to tomorrow.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-400">Day:</span>
              <input
                type="date"
                className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1"
                value={activeDay}
                onChange={e => setSimulatedToday(e.target.value)}
              />
              <button className="px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700" onClick={simulateNextDay} title="Advance one day and carry unfinished">
                Next Day →
              </button>
            </div>
          </header>

          <form onSubmit={addTask} className="mb-6 flex gap-2">
            <input
              className="flex-1 rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-3 outline-none focus:border-sky-500"
              placeholder="Add a task for today… (Enter to add)"
              value={text}
              onChange={e => setText(e.target.value)}
            />
            <button className="rounded-xl px-4 py-3 bg-sky-700 hover:bg-sky-600 font-medium">Add</button>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Inbox */}
            <section
              className={`bg-zinc-900/40 border rounded-2xl p-4 ${overInbox ? "border-sky-600" : "border-zinc-800"}`}
              onDragOver={handleInboxDragOver}
              onDrop={handleInboxDrop}
              onDragLeave={() => setOverInbox(false)}
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold">Today Inbox</h2>
                <span className="text-xs text-zinc-400">{inbox.length} item{inbox.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="flex flex-col gap-2 min-h-[80px]">
                {inbox.length === 0 && (
                  <p className="text-zinc-500 text-sm">Drag here to de‑prioritize or add a new task.</p>
                )}
                {inbox.map((t, i) => (
                  <TaskRow key={t.id} task={t} location="inbox" index={i} />
                ))}
              </div>
            </section>

            {/* Priority Stack */}
            <section className={`bg-zinc-900/40 border rounded-2xl p-4 ${overStackList ? "border-sky-600" : "border-zinc-800"}`}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold">Priority Stack</h2>
                <span className="text-xs text-zinc-400">Top = highest priority</span>
              </div>
              <ol
                className="flex flex-col gap-2 min-h-[80px]"
                onDragOver={handleStackListDragOver}
                onDrop={handleStackListDrop}
                onDragLeave={() => setOverStackList(false)}
              >
                {stack.length === 0 && (
                  <p className="text-zinc-500 text-sm">Drag items here to prioritize. Drop between items to set exact order.</p>
                )}
                {stack.map((t, i) => (
                  <li key={t.id} className="relative">
                    <div className="absolute -left-6 top-1 text-xs text-zinc-500">{i + 1}</div>
                    <TaskRow task={t} location="stack" index={i} />
                  </li>
                ))}
              </ol>
            </section>
          </div>

          {/* Completed Today */}
          <section className="mt-8 bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Completed Today</h2>
              <span className="text-xs text-zinc-400">{completedToday.length}</span>
            </div>
            <div className="grid gap-2">
              {completedToday.length === 0 ? (
                <p className="text-zinc-500 text-sm">Nothing completed yet. You got this.</p>
              ) : (
                completedToday.map(t => (
                  <div key={t.id} className="text-sm text-zinc-400 flex items-center gap-2">
                    <span className="line-through">{t.text}</span>
                    <button className="px-2 py-0.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs" onClick={() => toggleDone(t.id)}>
                      Undo
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          <footer className="mt-8 text-xs text-zinc-500 flex flex-col gap-1">
            <p>Tips: Drag from Inbox → Stack to prioritize; drag within Stack to reorder; drag back to Inbox to de‑prioritize. Double‑click a task to rename. Unfinished tasks carry to the next day automatically.</p>
            <p>Data stays in your browser (localStorage) so your existing tasks remain intact.</p>
          </footer>
        </div>
      </div>
    </div>
  );
}
