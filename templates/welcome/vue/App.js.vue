<script setup>
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

// Screens in the navbar; the first one is shown on load
const VIEWS = ['todo']

function loadTodos() {
  try {
    return JSON.parse(localStorage.getItem(TODO_KEY)) ?? []
  } catch {
    return []
  }
}

const view = ref(VIEWS[0])

// todo
const todos = ref(loadTodos())
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

const toggle = (id) => (todos.value = todos.value.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
const remove = (id) => (todos.value = todos.value.filter((t) => t.id !== id))
const checkLabel = (t) => `mark "${t.text}" as ${t.done ? 'not done' : 'done'}`

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
    </main>

    <button class="powered-badge" @click="openCeltrix">Powered by <span class="celtrix">Celtrix</span></button>
  </div>
</template>
