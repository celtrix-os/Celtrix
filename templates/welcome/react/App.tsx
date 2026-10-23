import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import './App.css'

const PROJECT = '__PROJECT_NAME__'
const STACK = '__STACK__'
const TODO_KEY = 'celtrix:todos'

type TodoItem = { id: number; text: string; done: boolean }
type RegisterForm = { username: string; email: string; password: string }
type FormErrors = Partial<Record<keyof RegisterForm, string>>

const EMPTY_FORM: RegisterForm = { username: '', email: '', password: '' }

function loadTodos(): TodoItem[] {
  try {
    return JSON.parse(localStorage.getItem(TODO_KEY) ?? '[]') as TodoItem[]
  } catch {
    return []
  }
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
    if (!value) return
    setTodos([...todos, { id: Date.now(), text: value, done: false }])
    setText('')
  }

  const toggle = (id: number) => setTodos(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
  const remove = (id: number) => setTodos(todos.filter((t) => t.id !== id))
  const open = todos.filter((t) => !t.done).length

  return (
    <section className="panel" aria-labelledby="todo-title">
      <h2 id="todo-title" className="panel-title">~/todo</h2>
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
        <p className="muted">no tasks yet</p>
      ) : (
        <ul className="todo-list">
          {todos.map((t) => (
            <li key={t.id} className={t.done ? 'done' : undefined}>
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
        </ul>
      )}
      <p className="muted status">
        {open} open · {todos.length - open} done
      </p>
    </section>
  )
}

function validate(form: RegisterForm): FormErrors {
  const errors: FormErrors = {}
  if (form.username.trim().length < 3) errors.username = 'needs at least 3 characters'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'enter a valid email'
  if (form.password.length < 8) errors.password = 'needs at least 8 characters'
  return errors
}

function RegisterPanel() {
  const [form, setForm] = useState<RegisterForm>(EMPTY_FORM)
  const [errors, setErrors] = useState<FormErrors>({})
  const [output, setOutput] = useState<string[]>([])
  const [failed, setFailed] = useState(false)

  const update = (e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const found = validate(form)
    setErrors(found)
    const hasErrors = Object.keys(found).length > 0
    setFailed(hasErrors)
    if (hasErrors) {
      setOutput(['✗ fix the fields above and try again'])
      return
    }
    // Demo only: send this to your own API instead, e.g. POST /api/auth/register
    setOutput([`✔ ${form.username.trim()} registered (demo, nothing was sent)`, '  hook this form up in src/App.tsx'])
    setForm(EMPTY_FORM)
  }

  const field = (name: keyof RegisterForm, type: string, autoComplete: string) => (
    <div className="field">
      <label htmlFor={`reg-${name}`}>--{name}</label>
      <input
        id={`reg-${name}`}
        name={name}
        type={type}
        value={form[name]}
        onChange={update}
        autoComplete={autoComplete}
        aria-invalid={Boolean(errors[name])}
        aria-describedby={errors[name] ? `reg-${name}-error` : undefined}
      />
      {errors[name] && (
        <span id={`reg-${name}-error`} className="error">
          {errors[name]}
        </span>
      )}
    </div>
  )

  return (
    <section className="panel" aria-labelledby="register-title">
      <h2 id="register-title" className="panel-title">~/register</h2>
      <form onSubmit={submit} noValidate>
        {field('username', 'text', 'username')}
        {field('email', 'email', 'email')}
        {field('password', 'password', 'new-password')}
        <button type="submit" className="submit">[ register ]</button>
      </form>
      <pre className={failed ? 'output failed' : 'output'} aria-live="polite">{output.join('\n')}</pre>
    </section>
  )
}

type View = 'todo' | 'register'
const VIEWS: View[] = ['todo', 'register']

export default function App() {
  const [view, setView] = useState<View>('todo')

  return (
    <div className="shell">
      <header className="nav">
        <span className="brand">
          celtrix<span className="dim">:~/</span>
          {PROJECT}
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
          <p>
            <span className="dim">$</span> npx celtrix {PROJECT}
          </p>
          <p className="ok">✔ {STACK} app ready</p>
          <p className="muted">
            edit <code>src/App.tsx</code> and save to reload
          </p>
        </div>
        {view === 'todo' ? <TodoPanel /> : <RegisterPanel />}
      </main>

      <button className="powered-badge" onClick={() => window.open('https://github.com/celtrix-os/Celtrix', '_blank')}>
        Powered by <span className="celtrix">Celtrix</span>
      </button>
    </div>
  )
}
