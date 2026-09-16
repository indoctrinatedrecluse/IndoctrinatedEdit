import { SnippetDefinition } from '../extensionTypes'

// 1. Node based
export const VUE_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'vue-sfc-setup',
    detail: 'Vue 3: Single File Component (<script setup>)',
    documentation: 'Vue 3 Composition API with <script setup lang="ts">, ref(), computed(), and glassmorphism styling',
    insertText: '<script setup lang="ts">\nimport { ref, computed } from "vue";\n\nconst props = defineProps<{\n  title: string;\n  initialCount?: number;\n}>();\n\nconst emit = defineEmits<{\n  (e: "change", value: number): void;\n}>();\n\nconst count = ref(props.initialCount ?? 0);\nconst doubleCount = computed(() => count.value * 2);\n\nfunction increment() {\n  count.value++;\n  emit("change", count.value);\n}\n</script>\n\n<template>\n  <div class="liquid-card">\n    <h2>{{ title }}</h2>\n    <p>Value: {{ count }} (Double: {{ doubleCount }})</p>\n    <button @click="increment">Increment</button>\n  </div>\n</template>\n\n<style scoped>\n.liquid-card {\n  padding: 16px;\n  border-radius: 12px;\n  background: rgba(255, 255, 255, 0.05);\n  backdrop-filter: blur(14px);\n  border: 1px solid rgba(255, 255, 255, 0.12);\n}\n</style>\n',
  },
]

export const SVELTE_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'svelte-runes-component',
    detail: 'Svelte 5: Modern Component with Runes ($state, $derived, $props)',
    documentation: 'Svelte 5 Runes reactivity using $state, $derived, and $props',
    insertText: '<script lang="ts">\n  interface Props {\n    title?: string;\n    multiplier?: number;\n  }\n\n  let { title = "Liquid Glass Svelte", multiplier = 2 }: Props = $props();\n  let count = $state(0);\n  let multiplied = $derived(count * multiplier);\n\n  function increment() {\n    count += 1;\n  }\n</script>\n\n<div class="glass-svelte-panel">\n  <h3>{title}</h3>\n  <p>Count: {count} | Multiplied: {multiplied}</p>\n  <button onclick={increment}>Add +1</button>\n</div>\n\n<style>\n  .glass-svelte-panel {\n    padding: 18px;\n    border-radius: 14px;\n    background: rgba(255, 255, 255, 0.06);\n    backdrop-filter: blur(16px);\n    border: 1px solid rgba(255, 255, 255, 0.14);\n  }\n</style>\n',
  },
]

export const SOLID_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'solid-component',
    detail: 'SolidJS: Fine-Grained Reactive Component (createSignal)',
    documentation: 'SolidJS component with fine-grained reactivity using createSignal and createEffect',
    insertText: 'import { createSignal, createEffect, type Component } from "solid-js";\n\nexport const ${1:SolidGlassWidget}: Component<{ title: string }> = (props) => {\n  const [count, setCount] = createSignal(0);\n\n  createEffect(() => {\n    console.log("Current Solid count:", count());\n  });\n\n  return (\n    <div class="glass-container">\n      <h2>{props.title}</h2>\n      <p>Score: {count()}</p>\n      <button onClick={() => setCount((c) => c + 1)}>Increment</button>\n    </div>\n  );\n};\n$0',
  },
]

export const PREACT_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'preact-signals-widget',
    detail: 'Preact: Lightweight Component with Signals',
    documentation: 'Preact component utilizing @preact/signals for reactive state without re-rendering',
    insertText: 'import { signal, computed } from "@preact/signals";\n\nconst count = signal(0);\nconst double = computed(() => count.value * 2);\n\nexport function ${1:PreactCounter}() {\n  return (\n    <div class="preact-glass-box">\n      <p>Preact Signal Value: {count}</p>\n      <p>Double: {double}</p>\n      <button onClick={() => count.value++}>Increment</button>\n    </div>\n  );\n}\n$0',
  },
]

// 2. Python based
export const STREAMLIT_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'streamlit-app',
    detail: 'Streamlit: Interactive Data App & Chat Interface',
    documentation: 'Streamlit dashboard with sidebar controls, metrics, and conversational chat',
    insertText: 'import streamlit as st\nimport pandas as pd\nimport numpy as np\n\nst.set_page_config(page_title="${1:IndoctrinatedEdit Dashboard}", layout="wide", page_icon="✨")\n\nst.title("✨ Liquid Glass AI & Data Engine")\n\nwith st.sidebar:\n    st.header("Settings")\n    dataset_size = st.slider("Sample Size", 100, 10000, 1000)\n    model_type = st.selectbox("Engine", ["Gemini Pro", "Claude 3.5", "DeepSeek R1"])\n\ndata = pd.DataFrame({\n    "Timestamp": pd.date_range(start="2026-01-01", periods=10, freq="D"),\n    "Throughput": np.random.randn(10).cumsum() + 50,\n})\n\nst.line_chart(data.set_index("Timestamp"))\n\nif prompt := st.chat_input("Ask streaming AI assistant..."): \n    with st.chat_message("user"):\n        st.write(prompt)\n    with st.chat_message("assistant"):\n        st.write(f"Synthesizing response via {model_type} for prompt: {prompt}")\n$0',
  },
]

export const DASH_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'dash-app',
    detail: 'Dash / Plotly: Reactive Web Analytics Dashboard',
    documentation: 'Dash web application with callback decorators and Plotly charts',
    insertText: 'from dash import Dash, html, dcc, callback, Output, Input\nimport plotly.express as px\nimport pandas as pd\n\napp = Dash(__name__)\n\ndf = pd.DataFrame({\n    "Fruit": ["Apples", "Oranges", "Bananas", "Apples", "Oranges", "Bananas"],\n    "Amount": [4, 1, 2, 2, 4, 5],\n    "City": ["SF", "SF", "SF", "Montreal", "Montreal", "Montreal"]\n})\n\nfig = px.bar(df, x="Fruit", y="Amount", color="City", barmode="group")\n\napp.layout = html.Div(className="glass-dash-container", children=[\n    html.H1(children="✨ IndoctrinatedEdit Dash Analytics"),\n    dcc.Graph(id="example-graph", figure=fig)\n])\n\nif __name__ == "__main__":\n    app.run_server(debug=True, port=8050)\n$0',
  },
]

export const REFLEX_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'reflex-app',
    detail: 'Reflex: Pure Python Full-Stack Reactive App',
    documentation: 'Reflex (formerly Pynecone) state and component UI definition in pure Python',
    insertText: 'import reflex as rx\n\nclass ${1:AppState}(rx.State):\n    count: int = 0\n\n    def increment(self):\n        self.count += 1\n\ndef index() -> rx.Component:\n    return rx.container(\n        rx.vstack(\n            rx.heading("✨ Reflex Liquid Glass Runtime", size="lg"),\n            rx.text(f"Live Count: {${1:AppState}.count}"),\n            rx.button("Increment +1", on_click=${1:AppState}.increment),\n            spacing="4",\n            align="center",\n        )\n    )\n\napp = rx.App()\napp.add_page(index)\n$0',
  },
]

export const FLET_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'flet-app',
    detail: 'Flet: Flutter-Powered Cross-Platform Python UI',
    documentation: 'Flet desktop and mobile application layout using Flutter widgets in Python',
    insertText: 'import flet as ft\n\ndef main(page: ft.Page):\n    page.title = "✨ IndoctrinatedEdit Flet Engine"\n    page.theme_mode = ft.ThemeMode.DARK\n    page.vertical_alignment = ft.MainAxisAlignment.CENTER\n\n    txt_number = ft.TextField(value="0", text_align=ft.TextAlign.RIGHT, width=100)\n\n    def minus_click(e):\n        txt_number.value = str(int(txt_number.value) - 1)\n        page.update()\n\n    def plus_click(e):\n        txt_number.value = str(int(txt_number.value) + 1)\n        page.update()\n\n    page.add(\n        ft.Row(\n            [\n                ft.IconButton(ft.Icons.REMOVE, on_click=minus_click),\n                txt_number,\n                ft.IconButton(ft.Icons.ADD, on_click=plus_click),\n            ],\n            alignment=ft.MainAxisAlignment.CENTER,\n        )\n    )\n\nft.app(target=main)\n$0',
  },
]

export const ANVIL_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'anvil-form',
    detail: 'Anvil: Full-Stack Python Web UI Component',
    documentation: 'Anvil client-side form module connected to server functions',
    insertText: 'from ._anvil_designer import ${1:MainForm}Template\nfrom anvil import *\nimport anvil.server\n\nclass ${1:MainForm}(${1:MainForm}Template):\n    def __init__(self, **properties):\n        self.init_components(**properties)\n        self.refresh_data()\n\n    def button_submit_click(self, **event_args):\n        result = anvil.server.call("process_submission", self.text_box_input.text)\n        Notification(result).show()\n        self.refresh_data()\n\n    def refresh_data(self):\n        self.repeating_panel_items.items = anvil.server.call("get_all_records")\n$0',
  },
]

// 3. PHP based
export const LIVEWIRE_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'livewire-component',
    detail: 'Livewire 3: Full-Stack Reactive Component',
    documentation: 'Laravel Livewire 3 component with reactive properties, wire:model, and actions',
    insertText: '<?php\n\nnamespace App\\Livewire;\n\nuse Livewire\\Component;\nuse Livewire\\Attributes\\Validate;\n\nclass ${1:AssetManager} extends Component\n{\n    #[Validate("required|min:3")]\n    public string $name = "";\n\n    public int $count = 0;\n\n    public function increment(): void\n    {\n        $this->count++;\n    }\n\n    public function save(): void\n    {\n        $this->validate();\n        session()->flash("message", "Asset successfully registered!");\n    }\n\n    public function render()\n    {\n        return view("livewire.${2:asset-manager}");\n    }\n}\n$0',
  },
]

export const INERTIA_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'inertia-vue-page',
    detail: 'Inertia.js: Modern Monolith SPA Adapter Page',
    documentation: 'Inertia.js page component with Head and Link routing without API boilerplate',
    insertText: '<script setup lang="ts">\nimport { Head, Link } from "@inertiajs/vue3";\n\ndefineProps<{\n  users: Array<{ id: number; name: string; email: string }>;\n}>();\n</script>\n\n<template>\n  <Head title="Users - IndoctrinatedEdit" />\n  <div class="glass-page">\n    <h1>User Directory</h1>\n    <ul>\n      <li v-for="user in users" :key="user.id">\n        {{ user.name }} ({{ user.email }})\n      </li>\n    </ul>\n    <Link href="/dashboard" class="glass-btn">Back to Dashboard</Link>\n  </div>\n</template>\n',
  },
]

export const BLADE_UI_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'blade-ui-kit-component',
    detail: 'Blade UI: Reusable Component with Slots & Attributes',
    documentation: 'Laravel Blade component with props, defaults, attributes, and slots',
    insertText: '@props([\n    "variant" => "glass",\n    "title" => "Liquid Panel"\n])\n\n<div {{ $attributes->merge(["class" => "panel-base panel-" . $variant]) }}>\n    <div class="panel-header">\n        <h4>{{ $title }}</h4>\n    </div>\n    <div class="panel-body">\n        {{ $slot }}\n    </div>\n</div>\n$0',
  },
]

export const SYMFONY_UX_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'symfony-ux-stimulus-controller',
    detail: 'Symfony UX: Stimulus Frontend Controller',
    documentation: 'Symfony UX Stimulus controller for interactive HTML behaviors',
    insertText: 'import { Controller } from "@hotwired/stimulus";\n\nexport default class extends Controller {\n    static targets = ["output", "input"];\n    static values = { refreshInterval: Number };\n\n    connect() {\n        console.log("Symfony UX Stimulus connected.");\n    }\n\n    greet() {\n        this.outputTarget.textContent = `Hello, ${this.inputTarget.value}!`;\n    }\n}\n$0',
  },
]

// 4. Ruby based
export const HOTWIRE_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'hotwire-turbo-frame',
    detail: 'Hotwire: Turbo Frame & Turbo Stream',
    documentation: 'Rails Hotwire turbo-frame tag for asynchronous page slice updates',
    insertText: '<%= turbo_frame_tag "${1:asset_item}_#{@${1:asset_item}.id}" do %>\n  <div class="liquid-card">\n    <h3><%= @${1:asset_item}.title %></h3>\n    <p><%= @${1:asset_item}.summary %></p>\n    <%= link_to "Edit", edit_${1:asset_item}_path(@${1:asset_item}), class: "glass-btn" %>\n  </div>\n<% end %>\n$0',
  },
]

export const VIEWCOMPONENT_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'view-component',
    detail: 'ViewComponent: Isolated Ruby View Component',
    documentation: 'GitHub ViewComponent Ruby class and companion template rendering',
    insertText: '# frozen_string_literal: true\n\nclass ${1:GlassBadge}Component < ViewComponent::Base\n  def initialize(label:, status: :active)\n    @label = label\n    @status = status\n  end\n\n  def status_color\n    @status == :active ? "text-emerald-400" : "text-amber-400"\n  end\nend\n$0',
  },
]

// 5. .NET based
export const BLAZOR_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'blazor-component',
    detail: 'Blazor: Razor Component with Parameters & EventCallbacks',
    documentation: 'Modern Blazor interactive WebAssembly/Server component with @code block',
    insertText: '@page "/${1:assets}"\n@inject HttpClient Http\n@rendermode InteractiveServer\n\n<div class="blazor-glass-card">\n    <h3>@Title</h3>\n    <p>Current count: <strong>@currentCount</strong></p>\n    <button class="btn btn-primary" @onclick="IncrementCount">Click me</button>\n</div>\n\n@code {\n    [Parameter]\n    public string Title { get; set; } = "Liquid Glass Blazor";\n\n    private int currentCount = 0;\n\n    private void IncrementCount()\n    {\n        currentCount++;\n    }\n}\n',
  },
]

// 6. HTML-first
export const ALPINE_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'alpine-widget',
    detail: 'Alpine.js: Declarative Reactive HTML Widget',
    documentation: 'Lightweight HTML-first reactivity using x-data, x-bind, x-on, and x-transition',
    insertText: '<div x-data="{ open: false, count: 0 }" class="glass-panel">\n  <button @click="open = !open" class="glass-btn">\n    Toggle Inspector (<span x-text="count"></span>)\n  </button>\n\n  <div x-show="open" x-transition class="mt-4 p-4 glass-card">\n    <p>Liquid Glass Modal Active</p>\n    <button @click="count++">Increment Count</button>\n  </div>\n</div>\n$0',
  },
]

export const FRONTEND_SNIPPETS: SnippetDefinition[] = [
  ...VUE_SNIPPETS,
  ...SVELTE_SNIPPETS,
  ...SOLID_SNIPPETS,
  ...PREACT_SNIPPETS,
  ...STREAMLIT_SNIPPETS,
  ...DASH_SNIPPETS,
  ...REFLEX_SNIPPETS,
  ...FLET_SNIPPETS,
  ...ANVIL_SNIPPETS,
  ...LIVEWIRE_SNIPPETS,
  ...INERTIA_SNIPPETS,
  ...BLADE_UI_SNIPPETS,
  ...SYMFONY_UX_SNIPPETS,
  ...HOTWIRE_SNIPPETS,
  ...VIEWCOMPONENT_SNIPPETS,
  ...BLAZOR_SNIPPETS,
  ...ALPINE_SNIPPETS,
]

export const frontendSnippets = FRONTEND_SNIPPETS
