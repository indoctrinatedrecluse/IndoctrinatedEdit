import { SnippetDefinition } from '../extensionTypes'

export const reactSnippets: SnippetDefinition[] = [
  // --- Modern React 19 & Component Architecture ---
  {
    label: 'react-fc',
    detail: 'React: Modern Functional Component with TypeScript Props',
    documentation: 'Type-safe React functional component with glassmorphism styling and children typing',
    insertText: 'import React from "react";\n\ninterface ${1:GlassCard}Props {\n  title: string;\n  description?: string;\n  children?: React.ReactNode;\n  onClick?: () => void;\n}\n\nexport const ${1:GlassCard}: React.FC<${1:GlassCard}Props> = ({\n  title,\n  description,\n  children,\n  onClick,\n}) => {\n  return (\n    <div className="glass-card" onClick={onClick}>\n      <h3 className="glass-title">{title}</h3>\n      {description && <p className="glass-desc">{description}</p>}\n      <div className="glass-body">{children}</div>\n    </div>\n  );\n};\n$0',
  },
  {
    label: 'react-action-state',
    detail: 'React 19: useActionState & Server Actions Form',
    documentation: 'React 19 form handling with useActionState and isPending transition feedback',
    insertText: 'import React, { useActionState } from "react";\n\ninterface ActionState {\n  success: boolean;\n  message: string;\n}\n\nasync function updateProfile(previousState: ActionState, formData: FormData): Promise<ActionState> {\n  const name = formData.get("name") as string;\n  await new Promise((resolve) => setTimeout(resolve, 500));\n  return { success: true, message: `Updated profile for ${name}` };\n}\n\nexport const ProfileForm = () => {\n  const [state, formAction, isPending] = useActionState(updateProfile, {\n    success: false,\n    message: "",\n  });\n\n  return (\n    <form action={formAction} className="glass-form">\n      <input name="name" placeholder="Enter full name" required />\n      <button type="submit" disabled={isPending}>\n        {isPending ? "Saving..." : "Save Profile"}\n      </button>\n      {state.message && <p className="status-msg">{state.message}</p>}\n    </form>\n  );\n};\n$0',
  },
  {
    label: 'react-optimistic',
    detail: 'React 19: useOptimistic State Hook',
    documentation: 'Instant UI feedback using React 19 useOptimistic for optimistic mutations',
    insertText: 'import React, { useOptimistic } from "react";\n\ninterface Message {\n  id: string;\n  text: string;\n  sending?: boolean;\n}\n\nexport const MessageList: React.FC<{ messages: Message[] }> = ({ messages }) => {\n  const [optimisticMessages, setOptimisticMessages] = useOptimistic(\n    messages,\n    (current, newMessage: string) => [\n      ...current,\n      { id: Math.random().toString(), text: newMessage, sending: true },\n    ]\n  );\n\n  return (\n    <ul className="message-list">\n      {optimisticMessages.map((msg) => (\n        <li key={msg.id} className={msg.sending ? "opacity-50" : ""}>\n          {msg.text} {msg.sending && <small>(Sending...)</small>}\n        </li>\n      ))}\n    </ul>\n  );\n};\n$0',
  },

  // --- Next.js App Router (RSC & Server Actions) ---
  {
    label: 'next-page',
    detail: 'Next.js: App Router Server Component Page (page.tsx)',
    documentation: 'Next.js 14/15 App Router Server Component page with dynamic params & metadata',
    insertText: 'import { Metadata } from "next";\n\ninterface PageProps {\n  params: Promise<{ slug: string }>;\n  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;\n}\n\nexport async function generateMetadata({ params }: PageProps): Promise<Metadata> {\n  const { slug } = await params;\n  return {\n    title: `IndoctrinatedEdit - ${slug}`,\n    description: "Next.js Liquid Glass Page",\n  };\n}\n\nexport default async function Page({ params }: PageProps) {\n  const { slug } = await params;\n  return (\n    <main className="container mx-auto p-6">\n      <h1 className="text-2xl font-bold">Viewing: {slug}</h1>\n      <p className="text-muted-foreground">React Server Component rendering on the edge.</p>\n    </main>\n  );\n}\n',
  },
  {
    label: 'next-api-route',
    detail: 'Next.js: App Router Route Handler (route.ts)',
    documentation: 'Type-safe Edge / Node.js API Route Handler with GET and POST methods',
    insertText: 'import { NextRequest, NextResponse } from "next/server";\n\nexport async function GET(request: NextRequest) {\n  const searchParams = request.nextUrl.searchParams;\n  const query = searchParams.get("q");\n\n  return NextResponse.json({\n    status: "ok",\n    runtime: "IndoctrinatedEdit Next.js Engine",\n    query,\n  });\n}\n\nexport async function POST(request: NextRequest) {\n  try {\n    const body = await request.json();\n    return NextResponse.json({ success: true, received: body }, { status: 201 });\n  } catch (err) {\n    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });\n  }\n}\n',
  },

  // --- State Management & Ecosystem (Zustand / TanStack Query / Framer Motion) ---
  {
    label: 'zustand-store',
    detail: 'Zustand: Typed State Store with Middleware',
    documentation: 'Zustand state store with persist middleware and immer-compatible mutations',
    insertText: 'import { create } from "zustand";\nimport { persist } from "zustand/middleware";\n\ninterface ${1:EditorState} {\n  themeId: string;\n  activeTabId: string | null;\n  setTheme: (id: string) => void;\n  setActiveTab: (id: string | null) => void;\n}\n\nexport const use${1:EditorStore} = create<${1:EditorState}>()(\n  persist(\n    (set) => ({\n      themeId: "liquid-glass-dark",\n      activeTabId: null,\n      setTheme: (themeId) => set({ themeId }),\n      setActiveTab: (activeTabId) => set({ activeTabId }),\n    }),\n    { name: "indoctrinated-editor-storage" }\n  )\n);\n$0',
  },
  {
    label: 'tanstack-query',
    detail: 'TanStack Query: useQuery & useMutation Hook',
    documentation: 'Asynchronous data fetching and cache invalidation with TanStack Query v5',
    insertText: 'import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";\n\nasync function fetchItems(): Promise<string[]> {\n  const res = await fetch("/api/v1/items");\n  if (!res.ok) throw new Error("Failed to fetch items");\n  return res.json();\n}\n\nexport function useItemsData() {\n  const queryClient = useQueryClient();\n\n  const query = useQuery({\n    queryKey: ["items"],\n    queryFn: fetchItems,\n    staleTime: 1000 * 60 * 5,\n  });\n\n  const mutation = useMutation({\n    mutationFn: async (newItem: string) => {\n      await fetch("/api/v1/items", {\n        method: "POST",\n        body: JSON.stringify({ item: newItem }),\n      });\n    },\n    onSuccess: () => {\n      queryClient.invalidateQueries({ queryKey: ["items"] });\n    },\n  });\n\n  return { ...query, addItem: mutation.mutate };\n}\n$0',
  },
  {
    label: 'framer-motion-liquid',
    detail: 'Framer Motion: Liquid Glass Animated Card',
    documentation: 'Smooth spring animated component with hover scale and specular sheen',
    insertText: 'import React from "react";\nimport { motion } from "framer-motion";\n\nexport const LiquidMotionCard: React.FC<{ title: string; children: React.ReactNode }> = ({\n  title,\n  children,\n}) => {\n  return (\n    <motion.div\n      className="liquid-motion-card"\n      initial={{ opacity: 0, y: 12, scale: 0.98 }}\n      animate={{ opacity: 1, y: 0, scale: 1 }}\n      exit={{ opacity: 0, scale: 0.96 }}\n      whileHover={{ y: -3, scale: 1.01 }}\n      transition={{ type: "spring", stiffness: 350, damping: 25 }}\n    >\n      <h3>{title}</h3>\n      {children}\n    </motion.div>\n  );\n};\n$0',
  },
]
