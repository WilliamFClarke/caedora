import {
  Bot,
  CheckCircle2,
  Circle,
  FileText,
  Folder,
  GitBranch,
  ListTree,
  Network,
  Search,
  Star,
} from 'lucide-react'
import type { Metadata } from 'next'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Caedora product screenshots',
  robots: {
    index: false,
    follow: false,
  },
}

const concepts = [
  { title: 'Customer Orders', type: 'BigQuery Table', active: true },
  { title: 'Revenue Definition', type: 'Metric' },
  { title: 'Customers', type: 'BigQuery Table' },
  { title: 'Monthly Review', type: 'Analysis' },
]

export default function ProductScreenshotsPage() {
  return (
    <main className="min-h-screen bg-[#07090c] p-10 text-white">
      <div className="mx-auto flex w-[1440px] flex-col gap-10">
        <ScreenshotCanvas name="hero">
          <AppMockup showGraph showAssistant />
        </ScreenshotCanvas>

        <ScreenshotCanvas name="editor">
          <AppMockup />
        </ScreenshotCanvas>

        <ScreenshotCanvas name="templates">
          <TemplateMarketplaceMockup />
        </ScreenshotCanvas>

        <ScreenshotCanvas name="argus">
          <AppMockup showAssistant assistantFocus />
        </ScreenshotCanvas>

        <ScreenshotCanvas name="connected">
          <AppMockup showGraph />
        </ScreenshotCanvas>
      </div>
    </main>
  )
}

function ScreenshotCanvas({
  name,
  children,
}: {
  name: string
  children: React.ReactNode
}) {
  return (
    <section
      data-product-screenshot={name}
      className="h-[860px] w-[1440px] overflow-hidden rounded-[28px] border border-white/10 bg-[#0b0f14] shadow-2xl"
    >
      {children}
    </section>
  )
}

function AppMockup({
  showGraph = false,
  showAssistant = false,
  assistantFocus = false,
}: {
  showGraph?: boolean
  showAssistant?: boolean
  assistantFocus?: boolean
}) {
  return (
    <div className="flex h-full bg-[#0d1117]">
      <aside className="w-[270px] border-r border-white/10 bg-[#080b10] p-5">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-full border border-white/20 bg-white text-sm font-semibold text-black">
            C
          </div>
          <div>
            <p className="text-sm font-semibold">Caedora</p>
            <p className="text-xs text-white/45">OKF vault</p>
          </div>
        </div>
        <div className="mb-4 flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/55">
          <Search className="size-3.5" />
          Search concepts
        </div>
        <SidebarSection title="Pinned">
          <SidebarRow icon={Star} label="Welcome" active={false} accent />
        </SidebarSection>
        <SidebarSection title="Concepts">
          <SidebarRow icon={ListTree} label="Index" index />
          <SidebarRow icon={Folder} label="Sales" />
          {concepts.map((concept) => (
            <SidebarRow
              key={concept.title}
              icon={FileText}
              label={concept.title}
              meta={concept.type}
              active={concept.active}
            />
          ))}
        </SidebarSection>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 items-center gap-4 border-b border-white/10 bg-[#0b0f14] px-5 text-sm text-white/70">
          <span className="rounded bg-white/[0.06] px-3 py-1">Normal</span>
          <span>B</span>
          <span className="italic">I</span>
          <span className="underline">Link</span>
          <span className="ml-auto flex items-center gap-2 text-emerald-300">
            <CheckCircle2 className="size-4" />
            OKF compliant
          </span>
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden">
          <article className="mx-auto max-w-[760px] px-8 pt-20">
            <div className="mb-5 flex items-center gap-2">
              <Badge className="bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/15">
                BigQuery Table
              </Badge>
              <Badge variant="outline" className="border-white/15 text-white/60">
                sales
              </Badge>
              <Badge variant="outline" className="border-white/15 text-white/60">
                revenue
              </Badge>
            </div>
            <h1 className="text-5xl font-bold tracking-tight">Customer Orders</h1>
            <p className="mt-4 text-xl leading-relaxed text-white/58">
              One row per completed customer order, linked to customers,
              revenue definitions, and monthly operating reviews.
            </p>
            <button className="mt-7 flex items-center gap-1 text-sm text-white/55">
              Details <span className="text-white/30">⌄</span>
            </button>
            <div className="mt-12 rounded-xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="mb-4 text-2xl font-semibold">Schema</h2>
              <div className="grid grid-cols-[180px_120px_1fr] gap-y-3 text-sm">
                <TableCell strong>Column</TableCell>
                <TableCell strong>Type</TableCell>
                <TableCell strong>Description</TableCell>
                <TableCell>order_id</TableCell>
                <TableCell>STRING</TableCell>
                <TableCell>Globally unique order identifier.</TableCell>
                <TableCell>customer_id</TableCell>
                <TableCell>STRING</TableCell>
                <TableCell>FK to Customers.</TableCell>
              </div>
            </div>
          </article>

          {showGraph && <GraphPanel />}
        </div>

        <div className="relative z-10 flex h-9 items-center border-t border-white/10 bg-[#080b10] px-4 text-[11px] text-white/45">
          <span>Saved just now</span>
          <span className="mx-auto font-mono">sales/customer-orders.md</span>
          <button className="mr-3 flex items-center gap-1 text-indigo-300">
            <Network className="size-3" />
            {showGraph ? 'Hide map' : 'Link map'}
          </button>
          <span className="flex items-center gap-1 text-emerald-300">
            <CheckCircle2 className="size-3" />
            OKF
          </span>
        </div>
      </section>

      {showAssistant && <AssistantPanel focus={assistantFocus} />}
    </div>
  )
}

function SidebarSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-6">
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-white/35">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function SidebarRow({
  icon: Icon,
  label,
  meta,
  active,
  accent,
  index,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  meta?: string
  active?: boolean
  accent?: boolean
  index?: boolean
}) {
  return (
    <div
      className={cn(
        'flex h-9 items-center gap-2 rounded-md px-2 text-sm',
        active ? 'bg-white/[0.10] text-white' : 'text-white/78',
        index && 'h-7 text-xs text-white/45'
      )}
    >
      <Icon className={cn('size-4 shrink-0', accent && 'fill-current text-blue-400', index && 'size-3.5')} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {meta && <span className="max-w-16 truncate font-mono text-[9px] uppercase text-white/35">{meta}</span>}
    </div>
  )
}

function TableCell({ children, strong }: { children: React.ReactNode; strong?: boolean }) {
  return (
    <div className={cn('border-b border-white/10 py-2 text-white/60', strong && 'font-medium text-white/85')}>
      {children}
    </div>
  )
}

function GraphPanel() {
  const nodes = [
    ['Customer Orders', 50, 48, true],
    ['Customers', 25, 36],
    ['Revenue Definition', 72, 31],
    ['Monthly Review', 67, 68],
    ['Sales Index', 34, 70],
  ] as const

  return (
    <div className="absolute right-0 bottom-0 left-0 h-[350px] border-t border-white/10 bg-[#0b0f14]/98 shadow-2xl">
      <div className="flex h-14 items-center border-b border-white/10 px-5">
        <div className="mr-3 grid size-8 place-items-center rounded-md bg-indigo-500/18 text-indigo-200">
          <Network className="size-4" />
        </div>
        <div>
          <p className="text-sm font-medium">Concept link map</p>
          <p className="text-xs text-white/45">5 concepts - 8 links</p>
        </div>
      </div>
      <div className="relative h-[296px]">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100">
          <line x1="50" y1="48" x2="25" y2="36" className="stroke-indigo-300/50" strokeWidth="0.8" />
          <line x1="50" y1="48" x2="72" y2="31" className="stroke-indigo-300/50" strokeWidth="0.8" />
          <line x1="50" y1="48" x2="67" y2="68" className="stroke-indigo-300/50" strokeWidth="0.8" />
          <line x1="50" y1="48" x2="34" y2="70" className="stroke-indigo-300/50" strokeWidth="0.8" />
        </svg>
        {nodes.map(([label, x, y, active]) => (
          <div
            key={label}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <div
              className={cn(
                'grid size-10 place-items-center rounded-full border',
                active
                  ? 'border-indigo-300 bg-indigo-400 text-black'
                  : 'border-white/18 bg-white/[0.06] text-white/70'
              )}
            >
              <Circle className={cn('size-3', active && 'fill-current')} />
            </div>
            <span className="rounded bg-black/40 px-2 py-1 text-xs text-white/75">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function AssistantPanel({ focus }: { focus?: boolean }) {
  return (
    <aside className="w-[340px] border-l border-white/10 bg-[#090d12] p-5">
      <div className="mb-5 flex items-center gap-3">
        <div className="grid size-9 place-items-center rounded-md bg-indigo-500/18 text-indigo-200">
          <Bot className="size-4" />
        </div>
        <div>
          <p className="text-sm font-medium">Argus AI</p>
          <p className="text-xs text-white/45">Reads this vault only</p>
        </div>
      </div>
      <div className="space-y-4 text-sm">
        <Bubble muted>Find the concepts linked to Customer Orders and summarize what depends on it.</Bubble>
        <Bubble>
          Customer Orders links to Customers, Revenue Definition, and Monthly Review. The backlinks show Sales Index and
          Revenue Definition reference it as source context.
        </Bubble>
        {focus && (
          <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-3 text-xs text-emerald-100">
            OKF guardrails active: preserve YAML metadata, add links, and write conformant Markdown.
          </div>
        )}
      </div>
    </aside>
  )
}

function Bubble({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <div className={cn('rounded-xl p-3 leading-relaxed', muted ? 'bg-white/[0.06] text-white/70' : 'bg-indigo-500/18 text-white/86')}>
      {children}
    </div>
  )
}

function TemplateMarketplaceMockup() {
  const templates = [
    ['Fitness planner', 'Workouts, measurements, nutrition notes.', 'fitness health planning'],
    ['Reading system', 'Books, source notes, and review workflows.', 'reading research learning'],
    ['Daily journal', 'Daily notes, weekly reviews, decisions.', 'journal review habits'],
    ['Project hub', 'Specs, milestones, retrospectives.', 'projects planning work'],
    ['Finance tracker', 'Budgets, subscriptions, money reviews.', 'finance budget'],
    ['Travel planner', 'Trips, itineraries, packing lists.', 'travel itinerary'],
  ]
  return (
    <div className="h-full bg-[#0d1117] p-10">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-indigo-300">Templates</p>
          <h1 className="text-5xl font-semibold tracking-tight">Linked OKF vaults, ready to import.</h1>
          <p className="mt-4 max-w-2xl text-lg text-white/55">
            Each template imports as concepts with YAML descriptions, resources, tags, and related links already wired.
          </p>
        </div>
        <div className="flex h-10 w-72 items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 text-white/45">
          <Search className="size-4" />
          Search templates
        </div>
      </div>
      <div className="grid grid-cols-3 gap-5">
        {templates.map(([title, description, tags]) => (
          <div key={title} className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
            <div className="mb-5 flex size-10 items-center justify-center rounded-md bg-indigo-500/18 text-indigo-200">
              <GitBranch className="size-5" />
            </div>
            <h2 className="text-lg font-medium">{title}</h2>
            <p className="mt-2 min-h-12 text-sm leading-relaxed text-white/55">{description}</p>
            <p className="mt-5 font-mono text-[11px] uppercase text-white/35">{tags}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
