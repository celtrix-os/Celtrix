<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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
type RegisterForm = { username: string; email: string; password: string }
type FormErrors = Partial<Record<keyof RegisterForm, string>>
type View = 'todo' | 'register'
type Field = { name: keyof RegisterForm; type: string; autocomplete: string; placeholder: string }

const EMPTY_FORM: RegisterForm = { username: '', email: '', password: '' }
const VIEWS: View[] = ['todo', 'register']
const FIELDS: Field[] = [
  { name: 'username', type: 'text', autocomplete: 'username', placeholder: 'ada' },
  { name: 'email', type: 'email', autocomplete: 'email', placeholder: 'ada@example.com' },
  { name: 'password', type: 'password', autocomplete: 'new-password', placeholder: 'at least 8 characters' },
]

function loadTodos(): TodoItem[] {
  try {
    return JSON.parse(localStorage.getItem(TODO_KEY) ?? '[]') as TodoItem[]
  } catch {
    return []
  }
}

const view = ref<View>('todo')

// todo
const todos = ref<TodoItem[]>(loadTodos())
const text = ref('')
const open = computed(() => todos.value.filter((t) => !t.done).length)

watch(
  todos,
  (value) => {
    try {
      localStorage.setItem(TODO_KEY, JSON.stringify(value))
    } catch {
      // storage can be unavailable (private mode), the list still works in memory
    }
  },
  { deep: true },
)

function add() {
  const value = text.value.trim()
  text.value = ''
  if (!value) return
  todos.value = [...todos.value, { id: Date.now(), text: value, done: false }]
}

const toggle = (id: number) => (todos.value = todos.value.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
const remove = (id: number) => (todos.value = todos.value.filter((t) => t.id !== id))
const checkLabel = (t: TodoItem) => `mark "${t.text}" as ${t.done ? 'not done' : 'done'}`

// register
const form = ref<RegisterForm>({ ...EMPTY_FORM })
const errors = ref<FormErrors>({})
const output = ref<string[]>([])
const failed = ref(false)

function validate(values: RegisterForm): FormErrors {
  const found: FormErrors = {}
  if (values.username.trim().length < 3) found.username = 'needs at least 3 characters'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) found.email = 'enter a valid email'
  if (values.password.length < 8) found.password = 'needs at least 8 characters'
  return found
}

function submit() {
  const found = validate(form.value)
  errors.value = found
  failed.value = Object.keys(found).length > 0
  if (failed.value) {
    output.value = ['✗ fix the fields above and try again']
    return
  }
  // Demo only: send this to your own API instead, e.g. POST /api/auth/register
  output.value = [`✔ ${form.value.username.trim()} registered (demo, nothing was sent)`, '  hook this form up in src/App.vue']
  form.value = { ...EMPTY_FORM }
}

const openCeltrix = () => window.open('https://github.com/celtrix-os/Celtrix', '_blank')
</script>

<template>
  <div class="shell">
    <header class="nav">
      <span class="brand">celtrix<span class="dim">:~$</span><span class="cursor" aria-hidden="true">_</span></span>
      <nav aria-label="Main">
        <button
          v-for="name in VIEWS"
          :key="name"
          type="button"
          :class="{ active: view === name }"
          :aria-current="view === name ? 'page' : undefined"
          @click="view = name"
        >
          {{ name }}
        </button>
        <a href="https://github.com/celtrix-os/Celtrix" target="_blank" rel="noreferrer">docs</a>
      </nav>
    </header>

    <main>
      <div class="intro">
        <pre class="logo" aria-hidden="true">{{ LOGO }}</pre>
        <h1>{{ PROJECT }}</h1>
        <p><span class="dim">$</span> npx celtrix {{ PROJECT }}</p>
        <p class="ok">✔ {{ STACK }} app ready</p>
        <p class="dim">edit <code>src/App.vue</code> and save to reload</p>
      </div>

      <section v-if="view === 'todo'" class="window" aria-labelledby="todo-title">
        <div class="window-bar">
          <h2 id="todo-title" class="window-title">~/{{ PROJECT }}/todo</h2>
          <span class="window-meta">{{ STACK }}</span>
        </div>
        <div class="window-body">
          <form class="prompt-row" @submit.prevent="add">
            <label for="todo-input" class="prompt">&gt;</label>
            <input id="todo-input" v-model="text" placeholder="add a task and press enter" autocomplete="off" />
          </form>
          <p v-if="todos.length === 0" class="empty">no tasks yet. type one above and press enter.</p>
          <ol v-else class="todo-list">
            <li v-for="(t, i) in todos" :key="t.id" :class="{ done: t.done }">
              <span class="index" aria-hidden="true">{{ String(i + 1).padStart(2, '0') }}</span>
              <button
                type="button"
                class="check"
                :aria-pressed="t.done ? 'true' : 'false'"
                :aria-label="checkLabel(t)"
                @click="toggle(t.id)"
              >
                {{ t.done ? '[x]' : '[ ]' }}
              </button>
              <span class="todo-text">{{ t.text }}</span>
              <button type="button" class="rm" :aria-label="`delete &quot;${t.text}&quot;`" @click="remove(t.id)">rm</button>
            </li>
          </ol>
        </div>
        <div class="statusline" aria-hidden="true">
          <span class="mode">TODO</span>
          <span class="statusline-info">{{ open }} open · {{ todos.length - open }} done</span>
          <span class="statusline-right">utf-8 · vue</span>
        </div>
      </section>

      <section v-else class="window" aria-labelledby="register-title">
        <div class="window-bar">
          <h2 id="register-title" class="window-title">~/{{ PROJECT }}/register</h2>
          <span class="window-meta">{{ STACK }}</span>
        </div>
        <div class="window-body">
          <form novalidate @submit.prevent="submit">
            <div v-for="f in FIELDS" :key="f.name" class="field">
              <label :for="`reg-${f.name}`">--{{ f.name }}</label>
              <input
                :id="`reg-${f.name}`"
                v-model="form[f.name]"
                :name="f.name"
                :type="f.type"
                :placeholder="f.placeholder"
                :autocomplete="f.autocomplete"
                :aria-invalid="errors[f.name] ? 'true' : 'false'"
                :aria-describedby="errors[f.name] ? `reg-${f.name}-error` : undefined"
              />
              <span v-if="errors[f.name]" :id="`reg-${f.name}-error`" class="error">{{ errors[f.name] }}</span>
            </div>
            <button type="submit" class="submit">[ register ]</button>
          </form>
          <pre :class="failed ? 'output failed' : 'output'" aria-live="polite">{{ output.join('\n') }}</pre>
        </div>
        <div class="statusline" aria-hidden="true">
          <span class="mode">REGISTER</span>
          <span class="statusline-info">demo form</span>
          <span class="statusline-right">utf-8 · vue</span>
        </div>
      </section>
    </main>

    <button class="powered-badge" @click="openCeltrix">Powered by <span class="celtrix">Celtrix</span></button>
  </div>
</template>
