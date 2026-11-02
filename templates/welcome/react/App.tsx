import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import './App.css'

const PROJECT = '__PROJECT_NAME__'
const STACK = '__STACK__'
const TODO_KEY = 'celtrix:todos'
const LOGO = String.raw`             ____       _
  ________  / / /______(_)  __
 / ___/ _ \/ / __/ ___/ / |/_/
/ /__/  __/ / /_/ /  / />  <
\___/\___/_/\__/_/  /_/_/|_|`

type TodoItem = { id: number; text: string; done: boolean }

// Screens in the navbar; the first one is shown on load
const VIEWS = ['todo'] as const
type View = (typeof VIEWS)[number]

function loadTodos(): TodoItem[] {
  try {
    return JSON.parse(localStorage.getItem(TODO_KEY) ?? '[]') as TodoItem[]
  } catch {
    return []
  }
}

function Window({ id, title, meta, children }: { id: string; title: string; meta?: string; children: ReactNode }) {
  return (
    <section className="window" aria-labelledby={id}>
      <div className="window-bar">
        <h2 id={id} className="window-title">
          ~/{PROJECT}/{title}
        </h2>
        <span className="window-meta">{STACK}</span>
      </div>
      <div className="window-body">{children}</div>
      <div className="statusline" aria-hidden="true">
        <span className="mode">{title.toUpperCase()}</span>
        <span className="statusline-info">{meta}</span>
        <span className="statusline-right">utf-8 · react</span>
      </div>
    </section>
  )
}

function TodoPanel() {
  const [todos, setTodos] = useState<TodoItem[]>(loadTodos)
  const [text, setText] = useState('')

  useEffect(() => {
    try {
      localStorage.setItem(TODO_KEY, JSON.stringify(todos))
    } catch {
      // storage can be unavailable (private mode), the list still works in memory
    }
  }, [todos])

  const add = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const value = text.trim()
    if (!value) {
      setText('')
      return
    }
    setTodos([...todos, { id: Date.now(), text: value, done: false }])
    setText('')
  }

  const toggle = (id: number) => setTodos(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
  const remove = (id: number) => setTodos(todos.filter((t) => t.id !== id))
  const open = todos.filter((t) => !t.done).length

  return (
    <Window id="todo-title" title="todo" meta={`${open} open · ${todos.length - open} done`}>
      <form onSubmit={add} className="prompt-row">
        <label htmlFor="todo-input" className="prompt">&gt;</label>
        <input
          id="todo-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="add a task and press enter"
          autoComplete="off"
        />
      </form>
      {todos.length === 0 ? (
        <p className="empty">no tasks yet. type one above and press enter.</p>
      ) : (
        <ol className="todo-list">
          {todos.map((t, i) => (
            <li key={t.id} className={t.done ? 'done' : undefined}>
              <span className="index" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
              <button
                type="button"
                className="check"
                onClick={() => toggle(t.id)}
                aria-pressed={t.done}
                aria-label={`mark "${t.text}" as ${t.done ? 'not done' : 'done'}`}
              >
                {t.done ? '[x]' : '[ ]'}
              </button>
              <span className="todo-text">{t.text}</span>
              <button type="button" className="rm" onClick={() => remove(t.id)} aria-label={`delete "${t.text}"`}>
                rm
              </button>
            </li>
          ))}
        </ol>
      )}
    </Window>
  )
}

export default function App() {
  const [view, setView] = useState<View>(VIEWS[0])

  return (
    <div className="shell">
      <header className="nav">
        <span className="brand">
          celtrix<span className="dim">:~$</span>
          <span className="cursor" aria-hidden="true">_</span>
        </span>
        <nav aria-label="Main">
          {VIEWS.map((name) => (
            <button
              key={name}
              type="button"
              className={view === name ? 'active' : undefined}
              aria-current={view === name ? 'page' : undefined}
              onClick={() => setView(name)}
            >
              {name}
            </button>
          ))}
          <a href="https://github.com/celtrix-os/Celtrix" target="_blank" rel="noreferrer">
            docs
          </a>
        </nav>
      </header>

      <main>
        <div className="intro">
          <pre className="logo" aria-hidden="true">{LOGO}</pre>
          <h1>{PROJECT}</h1>
          <p>
            <span className="dim">$</span> npx celtrix {PROJECT}
          </p>
          <p className="ok">✔ {STACK} app ready</p>
          <p className="dim">
            edit <code>src/App.tsx</code> and save to reload
          </p>
        </div>
        {view === 'todo' && <TodoPanel />}
      </main>

      <button className="powered-badge" onClick={() => window.open('https://github.com/celtrix-os/Celtrix', '_blank')}>
        Powered by <span className="celtrix">Celtrix</span>
      </button>
    </div>
  )
}
