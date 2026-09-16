import { SnippetDefinition } from '../extensionTypes'

// 1. Elixir & Phoenix Snippets
export const ELIXIR_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'elixir-genserver',
    detail: 'Elixir: GenServer State Actor with Call & Cast Callbacks',
    documentation: 'OTP GenServer process implementation with client API and server callbacks',
    insertText: 'defmodule ${1:App.TelemetryServer} do\n  use GenServer\n\n  # --- Client API ---\n\n  def start_link(opts \\\\ []) do\n    GenServer.start_link(__MODULE__, opts, name: __MODULE__)\n  end\n\n  def get_state do\n    GenServer.call(__MODULE__, :get_state)\n  end\n\n  def record_event(event) do\n    GenServer.cast(__MODULE__, {:record, event})\n  end\n\n  # --- Server Callbacks ---\n\n  @impl true\n  def init(_opts) do\n    {:ok, %{events: [], counter: 0}}\n  end\n\n  @impl true\n  def handle_call(:get_state, _from, state) do\n    {:reply, state, state}\n  end\n\n  @impl true\n  def handle_cast({:record, event}, state) do\n    new_state = %{state | events: [event | state.events], counter: state.counter + 1}\n    {:noreply, new_state}\n  end\nend\n$0',
  },
  {
    label: 'elixir-liveview',
    detail: 'Elixir / Phoenix: LiveView Component with HEEx Template',
    documentation: 'Phoenix LiveView interactive stateful component with handle_event',
    insertText: 'defmodule ${1:AppWeb.GlassComponentLive} do\n  use ${1:AppWeb}, :live_view\n\n  @impl true\n  def mount(_params, _session, socket) do\n    {:ok, assign(socket, count: 0, title: "Liquid Glass BEAM Engine")}\n  end\n\n  @impl true\n  def handle_event("increment", _params, socket) do\n    {:noreply, update(socket, :count, &(&1 + 1))}\n  end\n\n  @impl true\n  def render(assigns) do\n    ~H"""\n    <div class="glass-beam-panel p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10">\n      <h2 class="text-xl font-bold text-white"><%= @title %></h2>\n      <p class="text-emerald-400 mt-2">Active Concurrency Count: <%= @count %></p>\n      <button phx-click="increment" class="mt-4 px-4 py-2 rounded-xl bg-blue-600/30 border border-blue-400/40 text-white font-medium hover:bg-blue-600/50">\n        Increment OTP Actor\n      </button>\n    </div>\n    """\n  end\nend\n$0',
  },
  {
    label: 'elixir-pattern-match',
    detail: 'Elixir: Function Pattern Matching with Guard Clauses',
    documentation: 'Multiple function heads with pattern matching and when guard clauses',
    insertText: 'def calculate_sheen(%{type: :specular, intensity: i}) when is_float(i) and i >= 0.0 do\n  {:ok, i * 1.25}\nend\n\ndef calculate_sheen(_invalid) do\n  {:error, :invalid_sheen_descriptor}\nend\n$0',
  },
]

// 2. Erlang Snippets
export const ERLANG_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'erlang-supervisor',
    detail: 'Erlang: OTP Supervisor Callback Module',
    documentation: 'Erlang supervisor behavior with one_for_one child restart strategy',
    insertText: '-module(${1:app_sup}).\n-behaviour(supervisor).\n\n-export([start_link/0]).\n-export([init/1]).\n\n-define(SERVER, ?MODULE).\n\nstart_link() ->\n    supervisor:start_link({local, ?SERVER}, ?MODULE, []).\n\ninit([]) ->\n    SupFlags = #{strategy => one_for_one, intensity => 5, period => 10},\n    ChildSpecs = [\n        #{id => ${2:app_worker},\n          start => {${2:app_worker}, start_link, []},\n          restart => permanent,\n          shutdown => 5000,\n          type => worker,\n          modules => [${2:app_worker}]}\n    ],\n    {ok, {SupFlags, ChildSpecs}}.\n$0',
  },
  {
    label: 'erlang-gen-server',
    detail: 'Erlang: gen_server Standard Callback Template',
    documentation: 'Erlang gen_server with handle_call, handle_cast, handle_info',
    insertText: '-module(${1:app_server}).\n-behaviour(gen_server).\n\n-export([start_link/0, init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2, code_change/3]).\n\nstart_link() ->\n    gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).\n\ninit([]) ->\n    {ok, #{counter => 0}}.\n\nhandle_call(get_count, _From, #{counter := Count} = State) ->\n    {reply, Count, State};\nhandle_call(_Request, _From, State) ->\n    {reply, ok, State}.\n\nhandle_cast({increment, Val}, #{counter := Count} = State) ->\n    {noreply, State#{counter => Count + Val}}.\n\nhandle_info(_Info, State) ->\n    {noreply, State}.\n\nterminate(_Reason, _State) ->\n    ok.\n\ncode_change(_OldVsn, State, _Extra) ->\n    {ok, State}.\n$0',
  },
]

// 3. Haskell Snippets
export const HASKELL_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'haskell-monad-transformer',
    detail: 'Haskell: ReaderT / ExceptT IO Application Monad Stack',
    documentation: 'Production Haskell typed application monad with environment and error handling',
    insertText: '{-# LANGUAGE OverloadedStrings #-}\n{-# LANGUAGE GeneralizedNewtypeDeriving #-}\n\nmodule ${1:App.Core} where\n\nimport Control.Monad.Reader\nimport Control.Monad.Except\nimport Data.Text (Text)\n\ndata AppEnv = AppEnv\n  { envDbConnection :: Text\n  , envLogLevel     :: Int\n  }\n\ndata AppError\n  = NotFoundError Text\n  | InternalError Text\n  deriving (Show, Eq)\n\nnewtype AppM a = AppM\n  { runAppM :: ReaderT AppEnv (ExceptT AppError IO) a\n  } deriving (Functor, Applicative, Monad, MonadReader AppEnv, MonadError AppError, MonadIO)\n\nexecuteTask :: Text -> AppM Text\nexecuteTask input = do\n  env <- ask\n  liftIO $ putStrLn $ "[Haskell] Running on: " ++ show (envDbConnection env)\n  return ("Processed: " <> input)\n$0',
  },
]

// 4. Clojure Snippets
export const CLOJURE_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'clojure-core-async',
    detail: 'Clojure: core.async Channel Pipeline with go-blocks',
    documentation: 'Clojure CSP async channels, go-loops, and transformation transducers',
    insertText: '(ns ${1:app.pipeline}\n  (:require [clojure.core.async :as async :refer [<! >! chan go go-loop timeout]]))\n\n(defn start-pipeline [input-ch output-ch]\n  (go-loop []\n    (when-let [item (<! input-ch)]\n      (let [transformed (assoc item :processed-at (System/currentTimeMillis))]\n        (>! output-ch transformed)\n        (recur)))))\n\n(defn demo-async []\n  (let [in (chan 10)\n        out (chan 10)]\n    (start-pipeline in out)\n    (go (>! in {:payload "Liquid Glass Clojure"})\n        (println "Received:" (<! out)))))\n$0',
  },
]

// 5. OCaml Snippets
export const OCAML_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'ocaml-dune-module',
    detail: 'OCaml: Signature & Functor Implementation with Pattern Matching',
    documentation: 'Type-safe OCaml module signature, types, and pattern match dispatcher',
    insertText: 'module type ${1:SERIALIZER} = sig\n  type t\n  val to_json : t -> string\n  val of_json : string -> (t, string) result\nend\n\ntype telemetry_item =\n  | Metric of { name : string; value : float }\n  | Event of { name : string; timestamp : int }\n\nlet format_item (item : telemetry_item) : string =\n  match item with\n  | Metric { name; value } -> Printf.sprintf "Metric[%s]=%.2f" name value\n  | Event { name; timestamp } -> Printf.sprintf "Event[%s]@%d" name timestamp\n$0',
  },
]

// 6. Janet Snippets
export const JANET_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'janet-defn',
    detail: 'Janet: Function Declaration with Docstring & Destructuring',
    documentation: 'Janet lisp defn with destructuring and docstring',
    insertText: '(defn ${1:compute-specular-blur}\n  "Calculates hardware glass blur radius based on surface roughness factor."\n  [intensity roughness &opt fallback]\n  (default fallback 0.5)\n  (if (nil? intensity)\n    fallback\n    (* intensity (- 1.0 roughness))))\n$0',
  },
  {
    label: 'janet-server-script',
    detail: 'Janet: Lightweight Fiber-Based Async Script',
    documentation: 'Janet embeddable lisp fiber loop and HTTP JSON handler module',
    insertText: '#!/usr/bin/env janet\n\n(defn calculate-specular-sheen [intensity roughness]\n  (* intensity (- 1.0 roughness)))\n\n(defn main [& args]\n  (print "✨ [IndoctrinatedEdit] Janet Lisp Engine Initialized")\n  (def sheen (calculate-specular-sheen 0.85 0.12))\n  (printf "Calculated Sheen Factor: %.4f" sheen))\n$0',
  },
]

export const BEAM_FUNCTIONAL_SNIPPETS: SnippetDefinition[] = [
  ...ELIXIR_SNIPPETS,
  ...ERLANG_SNIPPETS,
  ...HASKELL_SNIPPETS,
  ...CLOJURE_SNIPPETS,
  ...OCAML_SNIPPETS,
  ...JANET_SNIPPETS,
]

export const beamFunctionalSnippets = BEAM_FUNCTIONAL_SNIPPETS
