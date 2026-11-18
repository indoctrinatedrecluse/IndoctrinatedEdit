import type * as monaco from 'monaco-editor'
import type { SnippetDefinition } from './extensionTypes'

interface CustomLanguageSpec {
  id: string
  extensions: string[]
  aliases: string[]
  keywords: string[]
  typeKeywords?: string[]
  lineComment?: string
  extraLineComments?: string[]
  blockComment?: [string, string]
  allowDashInIdent?: boolean
  noSingleQuoteStrings?: boolean
  tripleQuoteStrings?: boolean
  hasHtmlTags?: boolean
  dollarIdentifiers?: boolean
}

/**
 * Custom language definitions & Monarch syntax specs for languages not built into Monaco Editor
 * (plus 'solidity', 'vue', 'svelte' so extension language IDs highlight cleanly in Monaco).
 */
export const CUSTOM_MONACO_LANGUAGES: CustomLanguageSpec[] = [
  {
    id: 'zig',
    extensions: ['.zig', '.zon'],
    aliases: ['Zig'],
    keywords: ['const', 'var', 'fn', 'pub', 'return', 'if', 'else', 'while', 'for', 'switch', 'break', 'continue', 'defer', 'errdefer', 'try', 'catch', 'orelse', 'struct', 'enum', 'union', 'error', 'comptime', 'inline', 'test', 'usingnamespace', 'and', 'or', 'async', 'await', 'suspend', 'resume', 'unreachable', 'undefined', 'null', 'true', 'false'],
    typeKeywords: ['void', 'bool', 'u8', 'u16', 'u32', 'u64', 'u128', 'usize', 'i8', 'i16', 'i32', 'i64', 'i128', 'isize', 'f16', 'f32', 'f64', 'f128', 'anyerror', 'anytype', 'type', 'noreturn'],
    lineComment: '//',
  },
  {
    id: 'erlang',
    extensions: ['.erl', '.hrl'],
    aliases: ['Erlang'],
    keywords: ['after', 'and', 'andalso', 'band', 'begin', 'bnot', 'bor', 'bsl', 'bsr', 'bxor', 'case', 'catch', 'cond', 'div', 'end', 'fun', 'if', 'let', 'not', 'of', 'or', 'orelse', 'receive', 'rem', 'try', 'when', 'xor', 'true', 'false', 'ok', 'error'],
    lineComment: '%',
  },
  {
    id: 'haskell',
    extensions: ['.hs', '.lhs'],
    aliases: ['Haskell'],
    keywords: ['case', 'class', 'data', 'default', 'deriving', 'do', 'else', 'forall', 'foreign', 'if', 'import', 'in', 'infix', 'infixl', 'infixr', 'instance', 'let', 'module', 'newtype', 'of', 'qualified', 'then', 'type', 'where', 'True', 'False'],
    typeKeywords: ['Int', 'Integer', 'Float', 'Double', 'Bool', 'Char', 'String', 'Maybe', 'Either', 'IO', 'Monad', 'Functor', 'Applicative'],
    lineComment: '--',
    blockComment: ['{-', '-}'],
    noSingleQuoteStrings: true,
  },
  {
    id: 'ocaml',
    extensions: ['.ml', '.mli', '.re'],
    aliases: ['OCaml', 'ReasonML'],
    keywords: ['and', 'as', 'assert', 'begin', 'class', 'constraint', 'do', 'done', 'downto', 'else', 'end', 'exception', 'external', 'false', 'for', 'fun', 'function', 'functor', 'if', 'in', 'include', 'inherit', 'initializer', 'lazy', 'let', 'match', 'method', 'module', 'mutable', 'new', 'nonrec', 'object', 'of', 'open', 'or', 'private', 'rec', 'sig', 'struct', 'then', 'to', 'true', 'try', 'type', 'val', 'virtual', 'when', 'while', 'with'],
    typeKeywords: ['int', 'float', 'bool', 'char', 'string', 'unit', 'list', 'array', 'option', 'result'],
    blockComment: ['(*', '*)'],
    noSingleQuoteStrings: true,
  },
  {
    id: 'janet',
    extensions: ['.janet', '.jdn'],
    aliases: ['Janet'],
    keywords: ['def', 'var', 'fn', 'defn', 'defn-', 'defmacro', 'let', 'if', 'when', 'cond', 'case', 'match', 'do', 'loop', 'while', 'for', 'each', 'try', 'set', 'import', 'use', 'true', 'false', 'nil'],
    lineComment: '#',
    allowDashInIdent: true,
  },
  {
    id: 'prisma',
    extensions: ['.prisma'],
    aliases: ['Prisma'],
    keywords: ['datasource', 'generator', 'model', 'enum', 'type', 'view', 'true', 'false', 'null'],
    typeKeywords: ['String', 'Int', 'Float', 'Boolean', 'DateTime', 'Json', 'Bytes', 'BigInt', 'Decimal', 'Unsupported'],
    lineComment: '//',
  },
  {
    id: 'matlab',
    extensions: ['.m', '.mlx'],
    aliases: ['MATLAB'],
    keywords: ['break', 'case', 'catch', 'classdef', 'continue', 'else', 'elseif', 'end', 'for', 'function', 'global', 'if', 'otherwise', 'parfor', 'persistent', 'return', 'spmd', 'switch', 'try', 'while', 'true', 'false', 'properties', 'methods'],
    lineComment: '%',
    blockComment: ['%{', '%}'],
  },
  {
    id: 'gdscript',
    extensions: ['.gd'],
    aliases: ['GDScript'],
    keywords: ['extends', 'class_name', 'class', 'trait', 'func', 'var', 'const', 'signal', 'enum', 'static', 'if', 'elif', 'else', 'for', 'while', 'match', 'break', 'continue', 'pass', 'return', 'in', 'is', 'as', 'and', 'or', 'not', 'self', 'super', 'await', 'preload', 'load', 'true', 'false', 'null'],
    typeKeywords: ['void', 'bool', 'int', 'float', 'String', 'Vector2', 'Vector3', 'Node', 'Node2D', 'Node3D', 'CharacterBody2D', 'CharacterBody3D', 'Array', 'Dictionary'],
    lineComment: '#',
    tripleQuoteStrings: true,
  },
  {
    id: 'ipynb',
    extensions: ['.ipynb'],
    aliases: ['Jupyter Notebook'],
    keywords: ['cells', 'metadata', 'nbformat', 'nbformat_minor', 'cell_type', 'source', 'outputs', 'execution_count', 'true', 'false', 'null'],
    lineComment: '//',
  },
  {
    id: 'gradle-kotlin',
    extensions: ['.gradle.kts'],
    aliases: ['Gradle Kotlin DSL'],
    keywords: ['plugins', 'dependencies', 'repositories', 'android', 'tasks', 'val', 'var', 'fun', 'if', 'else', 'for', 'when', 'import', 'implementation', 'testImplementation', 'api', 'compileOnly', 'runtimeOnly', 'true', 'false', 'null'],
    lineComment: '//',
    blockComment: ['/*', '*/'],
  },
  {
    id: 'prolog',
    extensions: ['.pl', '.pro', '.prolog', '.yap', '.p', '.dl'],
    aliases: ['Prolog'],
    keywords: ['is', 'not', 'fail', 'true', 'false', 'cut', 'assert', 'asserta', 'assertz', 'retract', 'dynamic', 'module', 'use_module', 'findall', 'bagof', 'setof', 'member', 'append', 'length', 'write', 'nl'],
    lineComment: '%',
    blockComment: ['/*', '*/'],
  },
  {
    id: 'lisp',
    extensions: ['.lisp', '.lsp', '.cl', '.el'],
    aliases: ['Common Lisp', 'Lisp', 'Emacs Lisp'],
    keywords: ['defun', 'defmacro', 'defvar', 'defparameter', 'defconstant', 'defstruct', 'defclass', 'defmethod', 'lambda', 'let', 'let*', 'if', 'cond', 'when', 'unless', 'case', 'progn', 'loop', 'setf', 'setq', 'quote', 'car', 'cdr', 'cons', 'list', 'interactive', 'message', 'nil', 't'],
    lineComment: ';',
    blockComment: ['#|', '|#'],
    allowDashInIdent: true,
    noSingleQuoteStrings: true,
  },
  {
    id: 'lambda-calculus',
    extensions: ['.lc', '.lam', '.lambda'],
    aliases: ['Lambda Calculus'],
    keywords: ['def', 'let', 'in', 'rec', 'fun', 'lambda', 'true', 'false', 'if', 'then', 'else'],
    lineComment: ';',
    extraLineComments: ['--'],
    allowDashInIdent: true,
  },
  {
    id: 'lean',
    extensions: ['.lean'],
    aliases: ['Lean 4'],
    keywords: ['def', 'theorem', 'lemma', 'example', 'inductive', 'structure', 'class', 'instance', 'namespace', 'section', 'end', 'open', 'import', 'variable', 'universe', 'where', 'by', 'fun', 'let', 'in', 'if', 'then', 'else', 'match', 'with', 'do', 'return', 'have', 'show', 'from', 'forall', 'exists', 'sorry', 'Prop', 'Type', 'Sort'],
    lineComment: '--',
    blockComment: ['/-', '-/'],
    noSingleQuoteStrings: true,
  },
  {
    id: 'coq',
    extensions: ['.v'],
    aliases: ['Coq', 'Rocq'],
    keywords: ['Definition', 'Fixpoint', 'Theorem', 'Lemma', 'Corollary', 'Proposition', 'Inductive', 'Record', 'Proof', 'Qed', 'Defined', 'Admitted', 'Require', 'Import', 'Export', 'Section', 'End', 'Module', 'forall', 'exists', 'fun', 'match', 'with', 'end', 'if', 'then', 'else', 'let', 'in', 'intros', 'apply', 'rewrite', 'reflexivity', 'induction', 'destruct', 'simpl', 'auto', 'Prop', 'Set', 'Type'],
    blockComment: ['(*', '*)'],
    noSingleQuoteStrings: true,
  },
  {
    id: 'tla',
    extensions: ['.tla', '.als'],
    aliases: ['TLA+', 'Alloy'],
    keywords: ['MODULE', 'EXTENDS', 'CONSTANTS', 'CONSTANT', 'VARIABLES', 'VARIABLE', 'ASSUME', 'THEOREM', 'LOCAL', 'INSTANCE', 'WITH', 'LET', 'IN', 'IF', 'THEN', 'ELSE', 'CASE', 'OTHER', 'CHOOSE', 'UNCHANGED', 'ENABLED', 'SUBSET', 'UNION', 'DOMAIN', 'EXCEPT', 'TRUE', 'FALSE', 'BOOLEAN', 'sig', 'fact', 'pred', 'assert', 'check', 'run'],
    lineComment: '\\*',
    extraLineComments: ['//'],
    blockComment: ['(*', '*)'],
    noSingleQuoteStrings: true,
  },
  {
    id: 'sshconfig',
    extensions: ['.sshconfig'],
    aliases: ['SSH Config'],
    keywords: ['Host', 'Match', 'HostName', 'User', 'Port', 'IdentityFile', 'IdentitiesOnly', 'ForwardAgent', 'LocalForward', 'RemoteForward', 'ProxyJump', 'ProxyCommand', 'ServerAliveInterval', 'ServerAliveCountMax', 'StrictHostKeyChecking', 'UserKnownHostsFile', 'Compression', 'yes', 'no'],
    lineComment: '#',
  },
  {
    id: 'http',
    extensions: ['.http', '.rest'],
    aliases: ['HTTP'],
    keywords: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'TRACE', 'CONNECT', 'HTTP/1.1', 'HTTP/2', 'Authorization', 'Content-Type', 'Accept', 'User-Agent', 'Cache-Control'],
    lineComment: '#',
  },
  {
    id: 'odin',
    extensions: ['.odin'],
    aliases: ['Odin'],
    keywords: ['package', 'import', 'foreign', 'proc', 'struct', 'union', 'enum', 'bit_set', 'map', 'dynamic', 'distinct', 'using', 'if', 'else', 'when', 'for', 'switch', 'case', 'in', 'not_in', 'break', 'continue', 'fallthrough', 'defer', 'return', 'cast', 'transmute', 'auto_cast', 'or_else', 'or_return', 'context', 'true', 'false', 'nil'],
    typeKeywords: ['int', 'uint', 'i8', 'i16', 'i32', 'i64', 'u8', 'u16', 'u32', 'u64', 'f32', 'f64', 'bool', 'string', 'cstring', 'rawptr', 'any', 'byte', 'rune'],
    lineComment: '//',
    blockComment: ['/*', '*/'],
  },
  {
    id: 'nim',
    extensions: ['.nim', '.nims'],
    aliases: ['Nim'],
    keywords: ['proc', 'func', 'method', 'iterator', 'template', 'macro', 'converter', 'type', 'var', 'let', 'const', 'import', 'from', 'export', 'include', 'if', 'elif', 'else', 'when', 'case', 'of', 'for', 'while', 'break', 'continue', 'return', 'yield', 'try', 'except', 'finally', 'raise', 'defer', 'block', 'discard', 'object', 'tuple', 'enum', 'ref', 'ptr', 'seq', 'array', 'and', 'or', 'not', 'in', 'notin', 'is', 'as', 'true', 'false', 'nil'],
    typeKeywords: ['int', 'int8', 'int16', 'int32', 'int64', 'uint', 'float', 'float32', 'float64', 'bool', 'char', 'string', 'cstring', 'void', 'auto'],
    lineComment: '#',
    blockComment: ['#[', ']#'],
  },
  {
    id: 'assembly',
    extensions: ['.asm', '.s', '.S', '.nasm'],
    aliases: ['Assembly', 'x86/ARM ASM'],
    keywords: ['section', 'global', 'extern', 'db', 'dw', 'dd', 'dq', 'equ', 'mov', 'lea', 'add', 'sub', 'mul', 'imul', 'div', 'idiv', 'inc', 'dec', 'and', 'or', 'xor', 'not', 'shl', 'shr', 'cmp', 'test', 'jmp', 'je', 'jne', 'jg', 'jge', 'jl', 'jle', 'jz', 'jnz', 'call', 'ret', 'push', 'pop', 'nop', 'syscall', 'svc', 'int', 'ldr', 'str', 'adr', 'bl', 'bx'],
    typeKeywords: ['rax', 'rbx', 'rcx', 'rdx', 'rsi', 'rdi', 'rbp', 'rsp', 'r8', 'r9', 'r10', 'r11', 'r12', 'r13', 'r14', 'r15', 'eax', 'ebx', 'ecx', 'edx', 'esi', 'edi', 'ebp', 'esp', 'x0', 'x1', 'x2', 'x8', 'x29', 'x30', 'sp', 'lr', 'pc'],
    lineComment: ';',
    extraLineComments: ['//', '#'],
  },
  {
    id: 'wat',
    extensions: ['.wat', '.wast'],
    aliases: ['WebAssembly Text'],
    keywords: ['module', 'func', 'param', 'result', 'local', 'global', 'memory', 'table', 'elem', 'data', 'import', 'export', 'start', 'type', 'call', 'call_indirect', 'block', 'loop', 'if', 'then', 'else', 'end', 'br', 'br_if', 'return', 'drop', 'select', 'mut'],
    typeKeywords: ['i32', 'i64', 'f32', 'f64', 'v128', 'funcref', 'externref'],
    lineComment: ';;',
    blockComment: ['(;', ';)'],
    dollarIdentifiers: true,
  },
  {
    id: 'solidity',
    extensions: ['.sol'],
    aliases: ['Solidity'],
    keywords: ['pragma', 'solidity', 'import', 'contract', 'interface', 'library', 'abstract', 'is', 'struct', 'enum', 'event', 'error', 'modifier', 'function', 'constructor', 'fallback', 'receive', 'public', 'private', 'internal', 'external', 'pure', 'view', 'payable', 'virtual', 'override', 'constant', 'immutable', 'memory', 'storage', 'calldata', 'returns', 'return', 'if', 'else', 'for', 'while', 'do', 'break', 'continue', 'require', 'revert', 'assert', 'emit', 'new', 'delete', 'mapping', 'using', 'unchecked', 'assembly', 'true', 'false'],
    typeKeywords: ['address', 'bool', 'string', 'bytes', 'bytes32', 'uint', 'uint8', 'uint16', 'uint32', 'uint64', 'uint128', 'uint256', 'int', 'int256'],
    lineComment: '//',
    blockComment: ['/*', '*/'],
  },
  {
    id: 'move',
    extensions: ['.move'],
    aliases: ['Move'],
    keywords: ['module', 'script', 'use', 'public', 'entry', 'friend', 'fun', 'struct', 'has', 'copy', 'drop', 'store', 'key', 'const', 'let', 'mut', 'if', 'else', 'while', 'loop', 'break', 'continue', 'return', 'abort', 'acquires', 'move', 'spec', 'true', 'false'],
    typeKeywords: ['u8', 'u16', 'u32', 'u64', 'u128', 'u256', 'bool', 'address', 'signer', 'vector'],
    lineComment: '//',
    blockComment: ['/*', '*/'],
  },
  {
    id: 'cairo',
    extensions: ['.cairo'],
    aliases: ['Cairo'],
    keywords: ['mod', 'use', 'pub', 'fn', 'struct', 'enum', 'trait', 'impl', 'of', 'const', 'let', 'mut', 'ref', 'if', 'else', 'match', 'loop', 'while', 'for', 'in', 'break', 'continue', 'return', 'extern', 'type', 'nopanic', 'true', 'false'],
    typeKeywords: ['felt252', 'u8', 'u16', 'u32', 'u64', 'u128', 'u256', 'usize', 'bool', 'ContractAddress', 'Array', 'Span', 'Option', 'Result', 'Map'],
    lineComment: '//',
  },
  {
    id: 'vyper',
    extensions: ['.vy'],
    aliases: ['Vyper'],
    keywords: ['def', 'struct', 'enum', 'event', 'interface', 'implements', 'from', 'import', 'as', 'if', 'elif', 'else', 'for', 'in', 'break', 'continue', 'pass', 'return', 'assert', 'raise', 'log', 'send', 'raw_call', 'self', 'immutable', 'constant', 'public', 'HashMap', 'DynArray', 'True', 'False'],
    typeKeywords: ['uint256', 'uint8', 'int128', 'int256', 'bool', 'address', 'bytes32', 'Bytes', 'String', 'decimal'],
    lineComment: '#',
    tripleQuoteStrings: true,
  },
  {
    id: 'vue',
    extensions: ['.vue'],
    aliases: ['Vue'],
    keywords: ['template', 'script', 'style', 'setup', 'lang', 'scoped', 'import', 'export', 'default', 'const', 'let', 'ref', 'reactive', 'computed', 'watch', 'defineProps', 'defineEmits', 'onMounted', 'v-if', 'v-else', 'v-for', 'v-model', 'v-bind', 'v-on'],
    lineComment: '//',
    blockComment: ['<!--', '-->'],
    allowDashInIdent: true,
    hasHtmlTags: true,
  },
  {
    id: 'svelte',
    extensions: ['.svelte'],
    aliases: ['Svelte'],
    keywords: ['script', 'style', 'import', 'export', 'let', 'const', 'function', 'if', 'else', 'each', 'await', 'then', 'catch', 'key', 'html', 'onMount', 'createEventDispatcher', 'writable', 'derived'],
    lineComment: '//',
    blockComment: ['<!--', '-->'],
    allowDashInIdent: true,
    hasHtmlTags: true,
    dollarIdentifiers: true,
  },
  {
    id: 'cmake',
    extensions: ['.cmake'],
    aliases: ['CMake'],
    keywords: ['cmake_minimum_required', 'project', 'add_executable', 'add_library', 'target_link_libraries', 'target_include_directories', 'find_package', 'set', 'option', 'if', 'elseif', 'else', 'endif', 'foreach', 'endforeach', 'function', 'endfunction', 'install', 'include', 'enable_testing', 'add_test'],
    lineComment: '#',
    blockComment: ['#[[', ']]'],
  },
]

function buildMonarchTokenizer(spec: CustomLanguageSpec): monaco.languages.IMonarchLanguage {
  const root: monaco.languages.IMonarchLanguageRule[] = []

  // Push blockComment BEFORE lineComment so prefixes like `%{` / `#[` / `#[[` are not shadowed by `%` / `#`
  if (spec.blockComment) {
    const openEsc = spec.blockComment[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    root.push([new RegExp(openEsc), 'comment', '@blockComment'])
  }

  const lineComments = [spec.lineComment, ...(spec.extraLineComments || [])].filter(Boolean) as string[]
  for (const lc of lineComments) {
    const escaped = lc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    root.push([new RegExp(`${escaped}.*$`), 'comment'])
  }

  if (spec.tripleQuoteStrings) {
    root.push([/"""/, 'string', '@tripleString'])
  }

  if (spec.hasHtmlTags) {
    root.push([/<\/?[a-zA-Z][\w-]*/, 'tag'], [/\/?>/, 'tag'])
  }

  root.push([/"([^"\\]|\\.)*"/, 'string'])
  if (!spec.noSingleQuoteStrings) {
    root.push([/'([^'\\]|\\.)*'/, 'string'])
  }
  root.push(
    [/`([^`\\]|\\.)*`/, 'string'],
    [/\b0[xX][0-9a-fA-F_]+\b/, 'number.hex'],
    [/\b0[bB][01_]+\b/, 'number.binary'],
    [/\b\d[\d_]*(\.[\d_]+)?([eE][+-]?\d+)?\b/, 'number'],
    [/@@?[a-zA-Z_][\w-]*/, 'annotation']
  )

  if (spec.dollarIdentifiers) {
    root.push([/\$[a-zA-Z_][\w.-]*/, 'variable'])
  }

  const identPattern = spec.allowDashInIdent ? /[a-zA-Z_][\w-]*/ : /[a-zA-Z_]\w*/
  root.push(
    [
      identPattern,
      {
        cases: {
          '@keywords': 'keyword',
          '@typeKeywords': 'type',
          '@default': 'identifier',
        },
      },
    ],
    [/[{}()[\]]/, '@brackets'],
    [/[=><!~?:&|+\-*/^%]+/, 'operator'],
    [/[;,.]/, 'delimiter']
  )

  const tokenizer: Record<string, monaco.languages.IMonarchLanguageRule[]> = { root }

  if (spec.blockComment) {
    const closeEsc = spec.blockComment[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    tokenizer.blockComment = [
      [new RegExp(closeEsc), 'comment', '@pop'],
      [/./, 'comment'],
    ]
  }

  if (spec.tripleQuoteStrings) {
    tokenizer.tripleString = [
      [/"""/, 'string', '@pop'],
      [/./, 'string'],
    ]
  }

  return {
    keywords: spec.keywords,
    typeKeywords: spec.typeKeywords || [],
    tokenizer,
  }
}

function buildLanguageConfiguration(spec: CustomLanguageSpec): monaco.languages.LanguageConfiguration {
  const autoClosingPairs: monaco.languages.IAutoClosingPairConditional[] = [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"', notIn: ['string'] },
  ]
  if (!spec.noSingleQuoteStrings) {
    autoClosingPairs.push({ open: "'", close: "'", notIn: ['string', 'comment'] })
  }
  return {
    comments: {
      lineComment: spec.lineComment,
      blockComment: spec.blockComment,
    },
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')'],
    ],
    autoClosingPairs,
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      ...(spec.noSingleQuoteStrings ? [] : [{ open: "'", close: "'" }]),
    ],
  }
}

const registeredMonacoInstances = new WeakSet<object>()

/**
 * Registers all custom language IDs and Monarch tokenizers into Monaco once per Monaco instance.
 * Safe in unit-test environments with partial Monaco mocks.
 */
export function ensureCustomLanguagesRegistered(monacoInstance: typeof monaco): void {
  if (!monacoInstance?.languages) return
  if (registeredMonacoInstances.has(monacoInstance as unknown as object)) return
  registeredMonacoInstances.add(monacoInstance as unknown as object)

  const existingIds = new Set<string>()
  try {
    if (typeof monacoInstance.languages.getLanguages === 'function') {
      for (const lang of monacoInstance.languages.getLanguages()) {
        existingIds.add(lang.id)
      }
    }
  } catch {
    // Ignore mock getLanguages errors
  }

  for (const spec of CUSTOM_MONACO_LANGUAGES) {
    try {
      if (!existingIds.has(spec.id) && typeof monacoInstance.languages.register === 'function') {
        monacoInstance.languages.register({
          id: spec.id,
          extensions: spec.extensions,
          aliases: spec.aliases,
        })
      }
      if (typeof monacoInstance.languages.setLanguageConfiguration === 'function') {
        monacoInstance.languages.setLanguageConfiguration(spec.id, buildLanguageConfiguration(spec))
      }
      if (typeof monacoInstance.languages.setMonarchTokensProvider === 'function') {
        monacoInstance.languages.setMonarchTokensProvider(spec.id, buildMonarchTokenizer(spec))
      }
      // Register automatic hover documentation for language keywords & built-in types
      const docsMap: Record<string, string> = {}
      const label = spec.aliases[0] || spec.id
      for (const kw of spec.keywords) {
        docsMap[kw] = `Keyword in **${label}** language.`
      }
      for (const tk of spec.typeKeywords || []) {
        docsMap[tk] = `Built-in type in **${label}**.`
      }
      if (Object.keys(docsMap).length > 0) {
        registerHoverDocsProvider(monacoInstance, spec.id, docsMap)
      }
    } catch {
      // Safe fallback in mocked or restricted Monaco environments
    }
  }
}

/**
 * Registers a Monaco hover documentation provider for a language using a keyword/symbol dictionary.
 */
export function registerHoverDocsProvider(
  monacoInstance: typeof monaco,
  languageId: string,
  docsMap: Record<string, string>
): monaco.IDisposable | null {
  if (!monacoInstance?.languages?.registerHoverProvider) return null
  try {
    return monacoInstance.languages.registerHoverProvider(languageId, {
      provideHover: (model, position) => {
        const word = model.getWordAtPosition(position)
        if (!word) return null
        const doc = docsMap[word.word]
        if (!doc) return null
        return {
          range: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          },
          contents: [
            { value: `**\`${word.word}\`** _(${languageId})_` },
            { value: doc },
          ],
        }
      },
    })
  } catch {
    return null
  }
}

/**
 * Shared helper to register snippet completion items for one or more Monaco language IDs,
 * returning IDisposable handles for clean runtime enable/disable toggling.
 */
export function registerSnippetProviders(
  monacoInstance: typeof monaco,
  languageSnippets: Array<{ languageId: string; snippets: SnippetDefinition[]; detail?: string }>
): monaco.IDisposable[] {
  const disposables: monaco.IDisposable[] = []
  if (!monacoInstance?.languages?.registerCompletionItemProvider) return disposables

  for (const entry of languageSnippets) {
    if (!entry.snippets || entry.snippets.length === 0) continue
    try {
      const disposable = monacoInstance.languages.registerCompletionItemProvider(entry.languageId, {
        provideCompletionItems: (model, position) => {
          const word = model.getWordUntilPosition(position)
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          }
          const suggestions: monaco.languages.CompletionItem[] = entry.snippets.map((s) => ({
            label: s.label,
            kind: monacoInstance.languages.CompletionItemKind.Snippet,
            documentation: s.documentation,
            detail: s.detail || entry.detail,
            insertText: s.insertText,
            insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
          }))
          return { suggestions }
        },
      })
      if (disposable) disposables.push(disposable)
    } catch (err) {
      console.warn(`[ExtensionHelpers] Could not register completion provider for ${entry.languageId}:`, err)
    }
  }

  return disposables
}
