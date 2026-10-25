import { createEffect, createSignal, For, Show, type JSX } from 'solid-js'
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

function Window(props: { id: string; title: string; meta: string; children: JSX.Element }) {
  return (
    <section class="window" aria-labelledby={props.id}>
      <div class="window-bar">
        <h2 id={props.id} class="window-title">
          ~/{PROJECT}/{props.title}
        </h2>
        <span class="window-meta">{STACK}</span>
      </div>
      <div class="window-body">{props.children}</div>
      <div class="statusline" aria-hidden="true">
        <span class="mode">{props.title.toUpperCase()}</span>
        <span class="statusline-info">{props.meta}</span>
        <span class="statusline-right">utf-8 · solid</span>
      </div>
    </section>
  )
}

function TodoPanel() {
  const [todos, setTodos] = createSignal<TodoItem[]>(loadTodos())
  const [text, setText] = createSignal('')

  createEffect(() => {
    try {
      localStorage.setItem(TODO_KEY, JSON.stringify(todos()))
    } catch {
      // storage can be unavailable (private mode), the list still works in memory
    }
  })

  const add = (e: SubmitEvent) => {
    e.preventDefault()
    const value = text().trim()
    if (!value) {
      setText('')
      return
    }
    setTodos([...todos(), { id: Date.now(), text: value, done: false }])
    setText('')
  }

  const toggle = (id: number) => setTodos(todos().map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
  const remove = (id: number) => setTodos(todos().filter((t) => t.id !== id))
  const open = () => todos().filter((t) => !t.done).length

  return (
    <Window id="todo-title" title="todo" meta={`${open()} open · ${todos().length - open()} done`}>
      <form onSubmit={add} class="prompt-row">
        <label for="todo-input" class="prompt">&gt;</label>
        <input
          id="todo-input"
          value={text()}
          onInput={(e) => setText(e.currentTarget.value)}
          placeholder="add a task and press enter"
          autocomplete="off"
        />
      </form>
      <Show when={todos().length > 0} fallback={<p class="empty">no tasks yet. type one above and press enter.</p>}>
        <ol class="todo-list">
          <For each={todos()}>
            {(t, i) => (
              <li class={t.done ? 'done' : undefined}>
                <span class="index" aria-hidden="true">{String(i() + 1).padStart(2, '0')}</span>
                <button
                  type="button"
                  class="check"
                  onClick={() => toggle(t.id)}
                  aria-pressed={t.done ? 'true' : 'false'}
                  aria-label={`mark "${t.text}" as ${t.done ? 'not done' : 'done'}`}
                >
                  {t.done ? '[x]' : '[ ]'}
                </button>
                <span class="todo-text">{t.text}</span>
                <button type="button" class="rm" onClick={() => remove(t.id)} aria-label={`delete "${t.text}"`}>
                  rm
                </button>
              </li>
            )}
          </For>
        </ol>
      </Show>
    </Window>
  )
}

export default function App() {
  const [view, setView] = createSignal<View>(VIEWS[0])

  return (
    <div class="shell">
      <header class="nav">
        <span class="brand">
          celtrix<span class="dim">:~$</span>
          <span class="cursor" aria-hidden="true">_</span>
        </span>
        <nav aria-label="Main">
          <For each={VIEWS}>
            {(name) => (
              <button
                type="button"
                classList={{ active: view() === name }}
                aria-current={view() === name ? 'page' : undefined}
                onClick={() => setView(name)}
              >
                {name}
              </button>
            )}
          </For>
          <a href="https://github.com/celtrix-os/Celtrix" target="_blank" rel="noreferrer">
            docs
          </a>
        </nav>
      </header>

      <main>
        <div class="intro">
          <pre class="logo" aria-hidden="true">{LOGO}</pre>
          <h1>{PROJECT}</h1>
          <p>
            <span class="dim">$</span> npx celtrix {PROJECT}
          </p>
          <p class="ok">✔ {STACK} app ready</p>
          <p class="dim">
            edit <code>src/App.tsx</code> and save to reload
          </p>
        </div>
        <Show when={view() === 'todo'}>
          <TodoPanel />
        </Show>
      </main>

      <button class="powered-badge" onClick={() => window.open('https://github.com/celtrix-os/Celtrix', '_blank')}>
        Powered by <span class="celtrix">Celtrix</span>
      </button>
    </div>
  )
}
