// "Yapılacaklar": the to-do list with pomodoro estimates, as in the original game.
// Kept in this browser (no coins depend on it). The selected job moves forward while you focus.
import { create } from 'zustand';
import { useStore } from './store';

export interface Todo {
  id: string; t: string; c: string;
  /** estimated pomodoros, pomodoros done, focus minutes spent */
  est: number; done: number; min: number;
  ok: boolean; okAt: number | null; at: number;
}
const KEY = 'pw2.todos';
const MAX = 150;

interface TodoState {
  list: Todo[];
  sel: string | null;
  doneCount: number;
  add(title: string, est?: number, cat?: string): Todo | null;
  toggle(id: string): void;
  remove(id: string): void;
  select(id: string | null): void;
  /** a focus ended: count its minutes, and the pomodoro if it was finished */
  focusDone(minutes: number, completed: boolean): Todo | null;
}

const clean = (s: unknown, n: number) => (typeof s === 'string' ? s.replace(/[<>]/g, '').trim().slice(0, n) : '');
const int = (v: unknown, a: number, b: number, d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(a, Math.min(b, Math.floor(v))) : d);
function load(): Pick<TodoState, 'list' | 'sel' | 'doneCount'> {
  try {
    const o = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!o || typeof o !== 'object') throw 0;
    const list: Todo[] = (Array.isArray(o.list) ? o.list : []).filter((x: any) => x && typeof x.id === 'string' && clean(x.t, 80)).slice(0, MAX).map((x: any) => ({
      id: x.id.slice(0, 24), t: clean(x.t, 80), c: clean(x.c, 20) || 'Ders', est: int(x.est, 1, 20, 1), done: int(x.done, 0, 999, 0), min: int(x.min, 0, 1e6, 0),
      ok: !!x.ok, okAt: typeof x.okAt === 'number' ? x.okAt : null, at: typeof x.at === 'number' ? x.at : Date.now(),
    }));
    const sel = typeof o.sel === 'string' && list.some((t) => t.id === o.sel && !t.ok) ? o.sel : null;
    return { list, sel, doneCount: int(o.doneCount, 0, 1e6, 0) };
  } catch { return { list: [], sel: null, doneCount: 0 }; }
}

export const useTodos = create<TodoState>((set, get) => {
  const save = (p: Partial<TodoState>) => {
    set(p); const { list, sel, doneCount } = get();
    try { localStorage.setItem(KEY, JSON.stringify({ list, sel, doneCount })); } catch { /* private mode */ }
  };
  return {
    ...load(),
    add(title, est = 1, cat) {
      const t = clean(title, 80); if (!t) return null;
      let list = [...get().list];
      if (list.length >= MAX) { const i = list.findIndex((x) => x.ok); if (i < 0) { useStore.getState().flash('Liste dolu: önce birkaç işi tamamla ya da sil.'); return null; } list.splice(i, 1); }
      const td: Todo = { id: Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4), t, c: cat || useStore.getState().profile.category, est: int(est, 1, 20, 1), done: 0, min: 0, ok: false, okAt: null, at: Date.now() };
      list = [td, ...list]; save({ list }); return td;
    },
    toggle(id) {
      const s = get(); const td = s.list.find((x) => x.id === id); if (!td) return;
      const ok = !td.ok;
      save({ list: s.list.map((x) => (x.id === id ? { ...x, ok, okAt: ok ? Date.now() : null } : x)), sel: ok && s.sel === id ? null : s.sel, doneCount: s.doneCount + (ok ? 1 : 0) });
    },
    remove(id) { const s = get(); save({ list: s.list.filter((x) => x.id !== id), sel: s.sel === id ? null : s.sel }); },
    select(id) {
      const td = id ? get().list.find((x) => x.id === id && !x.ok) : null;
      save({ sel: td ? td.id : null });
      // the job's category becomes what you work on (desk animation and statistics)
      if (td) useStore.getState().setProfile({ category: td.c });
    },
    focusDone(minutes, completed) {
      const s = get(); const td = s.list.find((x) => x.id === s.sel); if (!td) return null;
      const next = { ...td, min: td.min + Math.max(0, Math.floor(minutes)), done: td.done + (completed ? 1 : 0) };
      save({ list: s.list.map((x) => (x.id === td.id ? next : x)) });
      return completed && next.done >= next.est && td.done < td.est ? next : null;
    },
  };
});

export const selectedTodo = () => { const s = useTodos.getState(); return s.list.find((t) => t.id === s.sel) ?? null; };
