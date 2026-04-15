import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ModeToggle } from '@/components/mode-toggle'
import {
  GitBranch,
  Brain,
  Lock,
  FileText,
  Zap,
  Github,
  Heart,
  TrendingUp,
  Coffee,
  Moon,
  Dumbbell,
  BookOpen,
} from 'lucide-react'

const features = [
  {
    icon: Lock,
    title: 'Completely Private',
    description:
      'Your notes live on your machine in a local folder. Nothing is uploaded anywhere. We never see your data.',
  },
  {
    icon: Brain,
    title: 'AI-Ready via MCP',
    description:
      'A built-in MCP server lets Claude, GPT, and other AI assistants access your personal knowledge base — with your permission.',
  },
  {
    icon: GitBranch,
    title: 'Git-Native',
    description:
      'Every note has full version history. Branch your ideas, merge decisions, and optionally push to GitHub for backup.',
  },
]

const exampleNotes = [
  { icon: Heart, label: 'Health', example: 'Side sleeper, lactose intolerant, target 8k steps/day' },
  { icon: TrendingUp, label: 'Finance', example: 'Portfolio: 60% index funds, 30% bonds, 10% crypto' },
  { icon: Coffee, label: 'Preferences', example: 'Oat milk flat white, dark chocolate, aisle seat' },
  { icon: Moon, label: 'Sleep', example: 'Avg 7.2hrs, best with 18\u00b0C room, no screens after 10pm' },
  { icon: Dumbbell, label: 'Fitness', example: '3x gym/week, PR: 100kg squat, runs 5k in 28min' },
  { icon: BookOpen, label: 'Learning', example: 'Reading: Atomic Habits, learning Rust, piano Grade 4' },
]

const steps = [
  {
    step: '01',
    title: 'Create a local folder',
    description:
      'Make a folder anywhere on your machine and optionally run git init. That\u2019s your vault.',
  },
  {
    step: '02',
    title: 'Write about your life',
    description:
      'Create markdown files for anything — health data, preferences, goals, daily logs, finances, habits.',
  },
  {
    step: '03',
    title: 'Connect your AI via MCP',
    description:
      'Point your AI assistant at your vault with a one-line MCP config. It now knows everything about you.',
  },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-background font-[family-name:var(--font-geist-sans)]">
      {/* Nav */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <span className="font-bold tracking-tight">personal-md</span>
            <Badge variant="outline" className="text-xs">
              beta
            </Badge>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="#features" className="hover:text-foreground transition-colors">
              Features
            </Link>
            <Link href="#how-it-works" className="hover:text-foreground transition-colors">
              How it works
            </Link>
            <Link href="#mcp" className="hover:text-foreground transition-colors">
              MCP
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <ModeToggle />
            <Button asChild>
              <Link href="/connect">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-screen-xl px-6 pt-24 pb-20 text-center">
          <Badge variant="outline" className="mb-6 gap-1.5">
            <Zap className="h-3 w-3" />
            Open source \u00b7 Local-first \u00b7 No data collection
          </Badge>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-[1.1]">
            Your life,
            <br />
            <span className="text-muted-foreground">fully documented.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            A personal wiki that lives on your machine. Track everything about yourself
            and give your AI assistant a rich, private knowledge base — nothing ever
            leaves your computer.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" asChild>
              <Link href="/connect">Get Started — It\u2019s Local</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link
                href="https://github.com/WilliamFClarke/personal-md"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="h-4 w-4" />
                View on GitHub
              </Link>
            </Button>
          </div>
        </section>

        {/* Example notes */}
        <section className="border-y bg-muted/30 py-12">
          <div className="mx-auto max-w-screen-xl px-6">
            <p className="text-center text-sm text-muted-foreground mb-8 uppercase tracking-wider">
              What people document in personal-md
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {exampleNotes.map(({ icon: Icon, label, example }) => (
                <div
                  key={label}
                  className="flex items-start gap-3 p-4 rounded-lg bg-background border"
                >
                  <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{example}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto max-w-screen-xl px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Built different</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              No accounts. No cloud sync. No data harvesting. Just your markdown files on your machine.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, description }) => (
              <Card key={title} className="border-border/50">
                <CardHeader>
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">{description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Separator />

        {/* How it works */}
        <section id="how-it-works" className="mx-auto max-w-screen-xl px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Up and running in minutes</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map(({ step, title, description }) => (
              <div key={step} className="flex flex-col gap-3">
                <span className="text-5xl font-bold text-muted-foreground/30">{step}</span>
                <h3 className="text-xl font-semibold">{title}</h3>
                <p className="text-muted-foreground leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <Separator />

        {/* MCP section */}
        <section id="mcp" className="mx-auto max-w-screen-xl px-6 py-24">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="outline" className="mb-4">
                MCP Server
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Your AI assistant
                <br />
                knows you intimately.
              </h2>
              <p className="text-muted-foreground text-lg mb-6 leading-relaxed">
                personal-md ships a built-in MCP (Model Context Protocol) server that reads
                directly from your local vault. Connect it to Claude, Cursor, or any MCP-compatible
                AI tool — no API keys, no cloud, no tokens.
              </p>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                Ask &quot;what did I eat this week?&quot;, &quot;what are my investment
                goals?&quot;, or &quot;remind me what my doctor said last month&quot; — and get
                answers grounded in <em>your</em> actual data.
              </p>
              <Button asChild>
                <Link href="/connect">Set Up Your Vault</Link>
              </Button>
            </div>
            <div className="bg-muted rounded-xl p-6 font-[family-name:var(--font-geist-mono)] text-sm border">
              <div className="text-muted-foreground mb-4 text-xs uppercase tracking-wider">
                ~/.claude/claude_desktop_config.json
              </div>
              <pre className="text-foreground leading-relaxed overflow-auto">{
`{\n  "mcpServers": {\n    "personal-md": {\n      "command": "npx",\n      "args": [\n        "personal-md-mcp",\n        "--vault",\n        "~/.personal-md"\n      ]\n    }\n  }\n}`}</pre>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t bg-muted/30">
          <div className="mx-auto max-w-screen-xl px-6 py-24 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Start documenting your life.</h2>
            <p className="text-muted-foreground text-lg mb-10 max-w-lg mx-auto">
              Free, open source, and entirely local. Your data never leaves your machine.
            </p>
            <Button size="lg" asChild>
              <Link href="/connect">Get Started in 2 Minutes</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto max-w-screen-xl px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>personal-md</span>
            <span>\u00b7</span>
            <span>Open source</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link
              href="https://github.com/WilliamFClarke/personal-md"
              className="hover:text-foreground transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </Link>
            <Link href="/docs" className="hover:text-foreground transition-colors">
              Docs
            </Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
