import { cva } from "class-variance-authority"

export const navigationMenuTriggerStyle = cva(
  "group inline-flex h-9 w-max items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-medium transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus:bg-zinc-100 focus:text-zinc-900 focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=open]:text-zinc-900 data-[state=open]:bg-zinc-100/50 data-[state=open]:hover:bg-zinc-100 data-[state=open]:focus:bg-zinc-100 dark:bg-zinc-950 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 dark:focus:bg-zinc-800 dark:focus:text-zinc-50 dark:data-[state=open]:text-zinc-50 dark:data-[state=open]:bg-zinc-800/50 dark:data-[state=open]:hover:bg-zinc-800 dark:data-[state=open]:focus:bg-zinc-800"
)
