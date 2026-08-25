'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FolderGit2, GitCommit, ShieldAlert, ShieldCheck, Gauge, ArrowRight, Activity, AlertTriangle, Cpu, Brain, Loader2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SeverityBadge } from '@/components/severity';
import {
  fetchDashboardMetrics,
  fetchSeverityDistribution,
  fetchCategoryDistribution,
  fetchProjects,
  fetchAllScans,
  fetchAllFindings,
  resetDemoData,
} from '@/lib/supabase/data';
import type { Project, Scan, Finding } from '@/lib/security/types';

const SEV_COLORS: Record<string, string> = {
  CRITICAL: 'hsl(0 72% 56%)',
  HIGH: 'hsl(18 85% 56%)',
  MEDIUM: 'hsl(38 92% 55%)',
  LOW: 'hsl(200 80% 60%)',
  INFO: 'hsl(215 16% 58%)',
};

const CATEGORY_LABELS: Record<string, string> = {
  sql_injection: 'SQL Injection',
  command_injection: 'Cmd Injection',
  hardcoded_secret: 'Hardcoded Secret',
  path_traversal: 'Path Traversal',
  weak_crypto: 'Weak Crypto',
  insecure_logging: 'Insecure Logging',
  ssrf: 'SSRF',
  missing_auth: 'Missing Auth',
  unsafe_cors: 'Unsafe CORS',
  insecure_deserialization: 'Deserialization',
};

export default function DashboardPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({ projects: 0, totalScans: 0, openFindings: 0, critical: 0, risk: 0 });
  const [sevDist, setSevDist] = useState<Record<string, number>>({});
  const [catDist, setCatDist] = useState<Record<string, number>>({});
  const [projects, setProjects] = useState<Project[]>([]);
  const [recentScans, setRecentScans] = useState<{ scan: Scan; projectName: string }[]>([]);
  const [recentFindings, setRecentFindings] = useState<Finding[]>([]);

  const load = useCallback(async () => {
    try {
      const [m, sev, cat, projs, scans, findings] = await Promise.all([
        fetchDashboardMetrics(),
        fetchSeverityDistribution(),
        fetchCategoryDistribution(),
        fetchProjects(),
        fetchAllScans(),
        fetchAllFindings(),
      ]);
      setMetrics(m);
      setSevDist(sev);
      setCatDist(cat);
      setProjects(projs);
      setRecentScans(scans);
      setRecentFindings(findings);
    } catch (e) {
      // If demo param, reset
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (params.get('demo') === '1') {
      resetDemoData().then(() => {
        router.replace('/app');
        load();
      });
    } else if (params.get('tour') === '1') {
      try { sessionStorage.setItem('codesentinel.tour', 'true'); } catch {}
      router.replace('/app');
      load();
    } else {
      load();
    }
  }, [params, router, load]);

  if (loading) return <DashboardSkeleton />;

  const sevData = Object.entries(sevDist).map(([name, value]) => ({ name, value }));
  const catData = Object.entries(catDist).map(([name, value]) => ({ name: CATEGORY_LABELS[name] ?? name, value }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Security overview across all projects</p>
        </div>
        <Button asChild>
          <Link href="/app/projects">View projects <ArrowRight className="ml-1 h-4 w-4" /></Link>
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard icon={FolderGit2} label="Projects" value={metrics.projects} />
        <MetricCard icon={GitCommit} label="Total Scans" value={metrics.totalScans} />
        <MetricCard icon={ShieldAlert} label="Open Findings" value={metrics.openFindings} accent="severity-high" />
        <MetricCard icon={AlertTriangle} label="Critical" value={metrics.critical} accent="severity-critical" />
        <MetricCard icon={Gauge} label="Avg Risk" value={metrics.risk} accent={metrics.risk >= 61 ? 'severity-critical' : metrics.risk >= 41 ? 'severity-medium' : 'severity-low'} suffix="/100" />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Findings by severity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sevData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={2}>
                    {sevData.map((d) => (
                      <Cell key={d.name} fill={SEV_COLORS[d.name]} stroke="hsl(var(--card))" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              {sevData.filter((d) => d.value > 0).map((d) => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs">
                  <span className="h-2 w-2 rounded-full" style={{ background: SEV_COLORS[d.name] }} />
                  <span className="text-muted-foreground">{d.name}</span>
                  <span className="font-mono">{d.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vulnerability categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={catData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} width={120} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                    cursor={{ fill: 'hsl(var(--secondary) / 0.4)' }}
                  />
                  <Bar dataKey="value" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent scans + findings */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recent scans</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentScans.length === 0 && <p className="text-sm text-muted-foreground">No scans yet. Create a project and run a scan.</p>}
            {recentScans.map(({ scan: s, projectName }) => (
              <Link
                key={s.id}
                href={`/app/scans/${s.id}`}
                className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:border-primary/30 hover:bg-secondary/30"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{projectName}</div>
                  <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                    <GitCommit className="h-3 w-3" /> {s.commit_sha.slice(0, 7)} · {s.findings_count} findings
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-mono text-sm">{s.risk_score}</div>
                    <div className="text-xs text-muted-foreground">risk</div>
                  </div>
                  <ShieldCheck className={`h-4 w-4 ${s.risk_score >= 61 ? 'text-severity-critical' : s.risk_score >= 41 ? 'text-severity-medium' : 'text-severity-low'}`} />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Latest findings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentFindings.length === 0 && <p className="text-sm text-muted-foreground">No findings yet.</p>}
            {recentFindings.map((f) => (
              <Link
                key={f.id}
                href={`/app/findings/${f.id}`}
                className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:border-primary/30 hover:bg-secondary/30"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{f.title}</div>
                  <div className="truncate font-mono text-xs text-muted-foreground">{f.file}:{f.line}</div>
                </div>
                <SeverityBadge severity={f.severity} />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  accent,
  suffix,
}: {
  icon: any;
  label: string;
  value: number;
  accent?: string;
  suffix?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{label}</span>
          <Icon className={`h-4 w-4 ${accent ? `text-${accent}` : 'text-muted-foreground'}`} />
        </div>
        <div className="mt-2 font-mono text-2xl font-semibold tabular-nums">
          {value}
          {suffix && <span className="text-base text-muted-foreground">{suffix}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-40 rounded shimmer" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 rounded-lg shimmer" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-64 rounded-lg shimmer" />
        <div className="h-64 rounded-lg shimmer lg:col-span-2" />
      </div>
    </div>
  );
}
