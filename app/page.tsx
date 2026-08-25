import Link from 'next/link';
import { ShieldCheck, ArrowRight, Cpu, Brain, GitBranch, FileCode2, Lock, Zap, Eye, CheckCircle2, AlertTriangle, Terminal, KeyRound, Network, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SeverityBadge } from '@/components/severity';

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <span className="font-mono text-base font-semibold tracking-tight">CodeSentinel</span>
            <span className="text-sm text-muted-foreground">AI</span>
          </Link>
          <nav className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/app">Open app</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/app?demo=1">Try demo <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute left-1/2 top-0 -z-10 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Deterministic analysis + AI reasoning
            </div>
            <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
              Find vulnerabilities.
              <br />
              <span className="text-primary">Understand why.</span> Fix with confidence.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground">
              AI-powered code security analysis grounded in deterministic evidence. Every finding is backed by
              source evidence, an attack path, and a verified patch.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/app?demo=1">Analyze a repository <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/app?tour=1">Watch demo tour <Play className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button size="lg" variant="ghost" asChild>
                <Link href="/app">View live demo</Link>
              </Button>
            </div>
          </div>

          {/* Floating finding preview */}
          <div className="mx-auto mt-16 max-w-3xl">
            <div className="rounded-xl border border-border bg-card/80 p-1 shadow-2xl backdrop-blur">
              <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
                <div className="flex gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-severity-critical/60" />
                  <div className="h-2.5 w-2.5 rounded-full bg-severity-medium/60" />
                  <div className="h-2.5 w-2.5 rounded-full bg-severity-low/60" />
                </div>
                <span className="ml-2 font-mono text-xs text-muted-foreground">app/database.py — finding #7</span>
              </div>
              <div className="grid gap-0 sm:grid-cols-2">
                <div className="border-r border-border p-5">
                  <SeverityBadge severity="HIGH" />
                  <h3 className="mt-3 font-mono text-sm font-semibold">SQL Injection — string interpolation</h3>
                  <p className="mt-2 text-xs text-muted-foreground">app/database.py:42</p>
                  <pre className="mt-4 overflow-x-auto rounded-md bg-background p-3 font-mono text-xs leading-relaxed text-muted-foreground">
{`42│ query = "SELECT * FROM users
   WHERE id=" + user_id
43│ cursor.execute(query)`}
                  </pre>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 text-xs text-primary">
                    <Brain className="h-3.5 w-3.5" /> AI Assessment — 94% confidence
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    User-controlled input is interpolated into a SQL string. An attacker can append
                    <span className="font-mono text-foreground"> ' OR 1=1 --</span> to bypass authentication.
                  </p>
                  <div className="mt-4 space-y-1.5">
                    {['User input', 'API parameter', 'String-built query', 'Database'].map((s, i) => (
                      <div key={s} className="flex items-center gap-2 text-xs">
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/15 font-mono text-[10px] text-primary">{i + 1}</span>
                        <span className="text-muted-foreground">{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem / Solution */}
      <section className="border-b border-border py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-12 md:grid-cols-2">
            <div>
              <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <AlertTriangle className="h-3.5 w-3.5 text-severity-high" /> The problem
              </div>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight">
                AI-generated code and rapidly changing repositories introduce real security risk.
              </h2>
              <p className="mt-4 text-muted-foreground">
                LLMs can write code fast, but they also introduce vulnerabilities at speed. Pure AI review
                hallucinates. Pure rule engines miss context. Neither is enough alone.
              </p>
            </div>
            <div>
              <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" /> The solution
              </div>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight">
                CodeSentinel combines deterministic analysis with grounded AI reasoning.
              </h2>
              <p className="mt-4 text-muted-foreground">
                Every finding is anchored to real source evidence, cross-checked by static rules, and
                explained by an AI that must justify its conclusions — never just &ldquo;trust me.&rdquo;
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Detection layers */}
      <section className="border-b border-border py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight">A multi-layer detection engine</h2>
            <p className="mt-3 text-muted-foreground">Each layer catches what the others miss. Findings are correlated, not duplicated.</p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Cpu, title: 'Deterministic rules', body: 'AST-style pattern analysis for SQL injection, command injection, path traversal, weak crypto, and more.', tag: '10 rule families' },
              { icon: KeyRound, title: 'Secret detection', body: 'Pattern + entropy analysis catches API keys, tokens, private keys, and password literals.', tag: 'Pattern + entropy' },
              { icon: Brain, title: 'AI reasoning', body: 'Grounded LLM assessment: is it exploitable? What is the attack path? Could it be a false positive?', tag: 'Structured output' },
              { icon: GitBranch, title: 'Finding correlation', body: 'Static + AI findings on the same code are merged into one finding with multiple sources.', tag: 'Multi-engine' },
              { icon: FileCode2, title: 'Patch generation', body: 'Suggested diffs you can inspect, accept, or reject. Re-scan verifies the fix.', tag: 'Verifiable' },
              { icon: Lock, title: 'Prompt-injection defense', body: 'Malicious comments telling the AI to ignore findings are detected and ignored.', tag: 'Hardened' },
            ].map((f) => (
              <Card key={f.title} className="group relative overflow-hidden border-border bg-card/50 transition-colors hover:border-primary/30">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <f.icon className="h-4.5 w-4.5" />
                    </div>
                    <h3 className="font-medium">{f.title}</h3>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{f.body}</p>
                  <div className="mt-4 inline-flex items-center rounded-md bg-secondary px-2 py-0.5 font-mono text-[11px] text-muted-foreground">{f.tag}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section className="border-b border-border py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-semibold tracking-tight">The developer workflow</h2>
          <div className="mt-12 flex flex-col items-stretch gap-3 md:flex-row md:items-center">
            {[
              { icon: FileCode2, label: 'Code' },
              { icon: Zap, label: 'Scan' },
              { icon: Eye, label: 'Detect' },
              { icon: Brain, label: 'Explain' },
              { icon: CheckCircle2, label: 'Fix' },
              { icon: ShieldCheck, label: 'Verify' },
            ].map((s, i, arr) => (
              <div key={s.label} className="flex flex-1 items-center gap-3">
                <div className="flex flex-1 flex-col items-center gap-2 rounded-xl border border-border bg-card/50 p-5 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <s.icon className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium">{s.label}</span>
                </div>
                {i < arr.length - 1 && <ArrowRight className="hidden h-4 w-4 shrink-0 text-muted-foreground md:block" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Rule catalog preview */}
      <section className="border-b border-border py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">A rule catalog that is extensible</h2>
              <p className="mt-3 text-muted-foreground">Each rule has an ID, severity, description, and remediation. Adding a new analyzer is one class.</p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/app">Open the app <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
          <div className="mt-10 overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Rule ID</th>
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="hidden px-4 py-3 text-left font-medium sm:table-cell">Category</th>
                  <th className="px-4 py-3 text-left font-medium">Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  ['PY-SQL-001', 'SQL Injection — string interpolation', 'sql_injection', 'HIGH'],
                  ['PY-CMD-001', 'Command Injection — os.system', 'command_injection', 'CRITICAL'],
                  ['SEC-SECRET-001', 'Hardcoded Secret — API key / token', 'hardcoded_secret', 'CRITICAL'],
                  ['PY-CRYPTO-001', 'Weak Cryptography — MD5/SHA1', 'weak_crypto', 'MEDIUM'],
                  ['PY-PATH-001', 'Path Traversal — user-controlled path', 'path_traversal', 'HIGH'],
                  ['PY-SSRF-001', 'SSRF — user-controlled URL fetch', 'ssrf', 'HIGH'],
                  ['PY-DESERIAL-001', 'Insecure Deserialization — pickle', 'insecure_deserialization', 'CRITICAL'],
                ].map((r) => (
                  <tr key={r[0]} className="hover:bg-secondary/30">
                    <td className="px-4 py-3 font-mono text-xs text-primary">{r[0]}</td>
                    <td className="px-4 py-3">{r[1]}</td>
                    <td className="hidden px-4 py-3 font-mono text-xs text-muted-foreground sm:table-cell">{r[2]}</td>
                    <td className="px-4 py-3"><SeverityBadge severity={r[3] as any} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section className="border-b border-border py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-semibold tracking-tight">Built for engineering depth</h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Terminal, title: 'Asynchronous scanning', body: 'Scans run stage-by-stage with real progress — not a fake timer.' },
              { icon: Network, title: 'Modular analyzers', body: 'Each analyzer is a single class. Add one without touching the pipeline.' },
              { icon: Brain, title: 'Resilient AI', body: 'If the AI layer fails, deterministic analysis still completes the scan.' },
              { icon: ShieldCheck, title: 'Evidence-first', body: 'Every finding ships with source evidence, an attack path, and a patch.' },
            ].map((f) => (
              <div key={f.title} className="rounded-xl border border-border bg-card/50 p-5">
                <f.icon className="h-5 w-5 text-primary" />
                <h3 className="mt-3 font-medium">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-semibold tracking-tight">See it work end-to-end</h2>
          <p className="mt-3 text-muted-foreground">Run a real scan on a vulnerable demo repository. Watch progress. Open a finding. Apply a patch. Re-scan. Verify.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/app?demo=1">Launch demo workspace <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/app?tour=1">Watch guided demo tour <Play className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button size="lg" variant="ghost" asChild>
              <Link href="/app/evaluation">View AI evaluation metrics</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span className="font-mono">CodeSentinel AI</span>
          </div>
          <p className="text-xs text-muted-foreground">Deterministic analysis + AI reasoning. Every finding grounded in evidence.</p>
        </div>
      </footer>
    </div>
  );
}
