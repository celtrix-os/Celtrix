<script>
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
	/** @typedef {{ id: number, text: string, done: boolean }} TodoItem */

	// Screens in the navbar; the first one is shown on load
	const VIEWS = ['todo'];

	let view = $state(VIEWS[0]);

	// todo
	/** @type {TodoItem[]} */
	let todos = $state([]);
	let text = $state('');
	let loaded = $state(false);
	let open = $derived(todos.filter((t) => !t.done).length);

	// localStorage only exists in the browser, so load after mount (not during SSR)
	onMount(() => {
		try {
			todos = JSON.parse(localStorage.getItem(TODO_KEY) ?? '[]');
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

	/** @param {SubmitEvent} e */
	function add(e) {
		e.preventDefault();
		const value = text.trim();
		text = '';
		if (!value) return;
		todos = [...todos, { id: Date.now(), text: value, done: false }];
	}

	/** @param {number} id */
	const toggle = (id) => (todos = todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
	/** @param {number} id */
	const remove = (id) => (todos = todos.filter((t) => t.id !== id));

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
		{/if}
	</main>

	<button class="powered-badge" onclick={openCeltrix}>Powered by <span class="celtrix">Celtrix</span></button>
</div>
