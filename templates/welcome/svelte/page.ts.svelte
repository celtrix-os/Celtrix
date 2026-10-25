<script lang="ts">
	import { onMount } from 'svelte';
	import './welcome.css';

	const PROJECT = '__PROJECT_NAME__';
	const STACK = '__STACK__';
	const TODO_KEY = 'celtrix:todos';
	const LOGO = String.raw`             ____       _
  ________  / / /______(_)  __
 / ___/ _ \/ / __/ ___/ / |/_/
/ /__/  __/ / /_/ /  / />  <
\___/\___/_/\__/_/  /_/_/|_|`;
	type TodoItem = { id: number; text: string; done: boolean };
	type RegisterForm = { username: string; email: string; password: string };
	type FormErrors = Partial<Record<keyof RegisterForm, string>>;
	type View = 'todo' | 'register';
	type Field = { name: keyof RegisterForm; type: string; autocomplete: AutoFill; placeholder: string };

	const EMPTY_FORM: RegisterForm = { username: '', email: '', password: '' };
	const VIEWS: View[] = ['todo', 'register'];
	const FIELDS: Field[] = [
		{ name: 'username', type: 'text', autocomplete: 'username', placeholder: 'ada' },
		{ name: 'email', type: 'email', autocomplete: 'email', placeholder: 'ada@example.com' },
		{ name: 'password', type: 'password', autocomplete: 'new-password', placeholder: 'at least 8 characters' }
	];

	let view = $state<View>('todo');

	// todo
	let todos = $state<TodoItem[]>([]);
	let text = $state('');
	let loaded = $state(false);
	let open = $derived(todos.filter((t) => !t.done).length);

	// localStorage only exists in the browser, so load after mount (not during SSR)
	onMount(() => {
		try {
			todos = JSON.parse(localStorage.getItem(TODO_KEY) ?? '[]') as TodoItem[];
		} catch {
			todos = [];
		}
		loaded = true;
	});

	$effect(() => {
		if (!loaded) return;
		try {
			localStorage.setItem(TODO_KEY, JSON.stringify(todos));
		} catch {
			// storage can be unavailable (private mode), the list still works in memory
		}
	});

	function add(e: SubmitEvent) {
		e.preventDefault();
		const value = text.trim();
		text = '';
		if (!value) return;
		todos = [...todos, { id: Date.now(), text: value, done: false }];
	}

	const toggle = (id: number) => (todos = todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
	const remove = (id: number) => (todos = todos.filter((t) => t.id !== id));

	// register
	let form = $state<RegisterForm>({ ...EMPTY_FORM });
	let errors = $state<FormErrors>({});
	let output = $state<string[]>([]);
	let failed = $state(false);

	function validate(values: RegisterForm): FormErrors {
		const found: FormErrors = {};
		if (values.username.trim().length < 3) found.username = 'needs at least 3 characters';
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) found.email = 'enter a valid email';
		if (values.password.length < 8) found.password = 'needs at least 8 characters';
		return found;
	}

	function submit(e: SubmitEvent) {
		e.preventDefault();
		const found = validate(form);
		errors = found;
		failed = Object.keys(found).length > 0;
		if (failed) {
			output = ['✗ fix the fields above and try again'];
			return;
		}
		// Demo only: send this to your own API instead, e.g. POST /api/auth/register
		output = [
			`✔ ${form.username.trim()} registered (demo, nothing was sent)`,
			'  hook this form up in src/routes/+page.svelte'
		];
		form = { ...EMPTY_FORM };
	}

	const openCeltrix = () => window.open('https://github.com/celtrix-os/Celtrix', '_blank');
</script>

<div class="shell">
	<header class="nav">
		<span class="brand">celtrix<span class="dim">:~$</span><span class="cursor" aria-hidden="true">_</span></span>
		<nav aria-label="Main">
			{#each VIEWS as name (name)}
				<button
					type="button"
					class:active={view === name}
					aria-current={view === name ? 'page' : undefined}
					onclick={() => (view = name)}
				>
					{name}
				</button>
			{/each}
			<a href="https://github.com/celtrix-os/Celtrix" target="_blank" rel="noreferrer">docs</a>
		</nav>
	</header>

	<main>
		<div class="intro">
			<pre class="logo" aria-hidden="true">{LOGO}</pre>
			<h1>{PROJECT}</h1>
			<p><span class="dim">$</span> npx celtrix {PROJECT}</p>
			<p class="ok">✔ {STACK} app ready</p>
			<p class="dim">edit <code>src/routes/+page.svelte</code> and save to reload</p>
		</div>

		{#if view === 'todo'}
			<section class="window" aria-labelledby="todo-title">
				<div class="window-bar">
					<h2 id="todo-title" class="window-title">~/{PROJECT}/todo</h2>
					<span class="window-meta">{STACK}</span>
				</div>
				<div class="window-body">
					<form class="prompt-row" onsubmit={add}>
						<label for="todo-input" class="prompt">&gt;</label>
						<input id="todo-input" bind:value={text} placeholder="add a task and press enter" autocomplete="off" />
					</form>
					{#if todos.length === 0}
						<p class="empty">no tasks yet. type one above and press enter.</p>
					{:else}
						<ol class="todo-list">
							{#each todos as t, i (t.id)}
								<li class:done={t.done}>
									<span class="index" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
									<button
										type="button"
										class="check"
										aria-pressed={t.done ? 'true' : 'false'}
										aria-label={`mark "${t.text}" as ${t.done ? 'not done' : 'done'}`}
										onclick={() => toggle(t.id)}
									>
										{t.done ? '[x]' : '[ ]'}
									</button>
									<span class="todo-text">{t.text}</span>
									<button type="button" class="rm" aria-label={`delete "${t.text}"`} onclick={() => remove(t.id)}>rm</button>
								</li>
							{/each}
						</ol>
					{/if}
				</div>
				<div class="statusline" aria-hidden="true">
					<span class="mode">TODO</span>
					<span class="statusline-info">{open} open · {todos.length - open} done</span>
					<span class="statusline-right">utf-8 · svelte</span>
				</div>
			</section>
		{:else}
			<section class="window" aria-labelledby="register-title">
				<div class="window-bar">
					<h2 id="register-title" class="window-title">~/{PROJECT}/register</h2>
					<span class="window-meta">{STACK}</span>
				</div>
				<div class="window-body">
					<form novalidate onsubmit={submit}>
						{#each FIELDS as f (f.name)}
							<div class="field">
								<label for={`reg-${f.name}`}>--{f.name}</label>
								<input
									id={`reg-${f.name}`}
									name={f.name}
									type={f.type}
									bind:value={form[f.name]}
									placeholder={f.placeholder}
									autocomplete={f.autocomplete}
									aria-invalid={errors[f.name] ? 'true' : 'false'}
									aria-describedby={errors[f.name] ? `reg-${f.name}-error` : undefined}
								/>
								{#if errors[f.name]}
									<span id={`reg-${f.name}-error`} class="error">{errors[f.name]}</span>
								{/if}
							</div>
						{/each}
						<button type="submit" class="submit">[ register ]</button>
					</form>
					<pre class={failed ? 'output failed' : 'output'} aria-live="polite">{output.join('\n')}</pre>
				</div>
				<div class="statusline" aria-hidden="true">
					<span class="mode">REGISTER</span>
					<span class="statusline-info">demo form</span>
					<span class="statusline-right">utf-8 · svelte</span>
				</div>
			</section>
		{/if}
	</main>

	<button class="powered-badge" onclick={openCeltrix}>Powered by <span class="celtrix">Celtrix</span></button>
</div>
