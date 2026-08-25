'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, GitCommit, FileCode2, CheckCircle2, Cpu, Brain, KeyRound, Network, ShieldCheck, Search, Filter, ArrowRightLeft, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SeverityBadge, StatusBadge, ConfidenceBar } from '@/components/severity';
import { fetchScan, fetchProject, fetchFindings, fetchScanEvents } from '@/lib/supabase/data';
import type { Scan, Project, Finding, ScanEvent } from '@/lib/security/types';

const STAGES: { key: string; label: string; icon: any }[] = [
  { key: 'queued', label: 'Queued', icon: ShieldCheck },
  { key: 'ingestion', label: 'Repository ingestion', icon: FileCode2 },
  { key: 'file_discovery', label: 'File discovery', icon: Search },
  { key: 'static_analysis', label: 'AST analysis', icon: Cpu },
  { key: 'secret_detection', label: 'Secret detection', icon: KeyRound },
  { key: 'ai_analysis', label: 'AI vulnerability analysis', icon: Brain },
  { key: 'correlation', label: 'Finding correlation', icon: Network },
  { key: 'risk_scoring', label: 'Risk scoring', icon: ShieldCheck },
  { key: 'report', label: 'Report generation', icon: CheckCircle2 },
  { key: 'completed', label: 'Completed', icon: CheckCircle2 },
];

export default function ScanDetail({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(true);
  const [scan, setScan] = useState<Scan | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [events, setEvents] = useState<ScanEvent[]>([]);
  const [animatedStage, setAnimatedStage] = useState(0);
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [filter, setFilter] = useState({ severity: 'all', source: 'all', status: 'all', search: '' });

  const load = useCallback(async () => {
    try {
      const s = await fetchScan(params.id);
      if (!s) { setLoading(false); return; }
      setScan(s);
      const [p, f, e] = await Promise.all([
        fetchProject(s.project_id),
        fetchFindings(s.id),
        fetchScanEvents(s.id),
      ]);
      setProject(p);
      setFindings(f);
      setEvents(e);
      if (s.status === 'COMPLETED') {
        const stageCount = STAGES.length;
        let i = 0;
        const interval = setInterval(() => {
          i++;
          setAnimatedStage(Math.min(i, stageCount - 1));
          setAnimatedProgress(Math.min(100, Math.round((i / (stageCount - 1)) * 100)));
          if (i >= stageCount - 1) clearInterval(interval);
        }, 180);
        return () => clearInterval(interval);
      }
    } catch {}
    setLoading(false);
  }, [params.id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!scan) return <NotFound />;

  const filtered = findings.filter((f) => {
    if (filter.severity !== 'all' && f.severity !== filter.severity) return false;
    if (filter.source !== 'all' && !f.sources.includes(filter.source as any)) return false;
    if (filter.status !== 'all' && f.status !== filter.status) return false;
    if (filter.search && !`${f.title} ${f.file} ${f.rule_id}`.toLowerCase().includes(filter.search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        {project && (
          <Link href={`/app/projects/${project.id}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> {project.name}
          </Link>
        )}
      </div>

      <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Scan <span className="font-mono text-primary">#{scan.id.slice(0, 6)}</span>
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-4 font-mono text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><GitCommit className="h-3 w-3" /> {scan.commit_sha.slice(0, 7)}</span>
            <span>{scan.files_scanned} files</span>
            <span>{scan.lines_scanned} lines</span>
            <span>{scan.findings_count} findings</span>
            <span>risk {scan.risk_score}/100</span>
          </div>
        </div>
        {scan.status === 'COMPLETED' && findings.length > 0 && (
          <Button variant="outline" asChild>
            <Link href={`/app/scans/${scan.id}/compare`}>
              <ArrowRightLeft className="mr-1 h-4 w-4" /> Compare scans
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-medium">
              {scan.status === 'COMPLETED' ? 'Scan completed' : 'Scanning...'}
            </span>
            <span className="font-mono text-sm tabular-nums text-muted-foreground">{animatedProgress}%</span>
          </div>
          <div className="mb-6 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${animatedProgress}%` }} />
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {STAGES.map((s, i) => {
              const done = i <= animatedStage;
              const current = i === animatedStage && scan.status === 'COMPLETED' && i < STAGES.length - 1;
              return (
                <div key={s.key} className={`flex items-center gap-2 rounded-lg border p-2.5 transition-colors ${done ? 'border-primary/30 bg-primary/5' : 'border-border'}`}>
                  <div className={`flex h-7 w-7 items-center justify-center rounded-md ${done ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    <s.icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-medium">{s.label}</div>
                    {done && <div className="text-[10px] text-primary">done</div>}
                    {current && <div className="text-[10px] text-primary">running</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Findings ({filtered.length})</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Input placeholder="Search findings, files, rules..." value={filter.search} onChange={(e) => setFilter({ ...filter, search: e.target.value })} />
            <Select value={filter.severity} onValueChange={(v) => setFilter({ ...filter, severity: v })}>
              <SelectTrigger><Filter className="mr-1 h-3.5 w-3.5" /><SelectValue placeholder="Severity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All severities</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="INFO">Info</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filter.source} onValueChange={(v) => setFilter({ ...filter, source: v })}>
              <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                <SelectItem value="static">Static only</SelectItem>
                <SelectItem value="ai">AI only</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filter.status} onValueChange={(v) => setFilter({ ...filter, status: v })}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                <SelectItem value="FIXED">Fixed</SelectItem>
                <SelectItem value="FALSE_POSITIVE">False positive</SelectItem>
                <SelectItem value="IGNORED">Ignored</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <CheckCircle2 className="h-8 w-8 text-severity-low" />
              <p className="text-sm text-muted-foreground">No findings match your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="px-3 py-2 text-left font-medium">Severity</th>
                    <th className="px-3 py-2 text-left font-medium">Finding</th>
                    <th className="hidden px-3 py-2 text-left font-medium sm:table-cell">File</th>
                    <th className="hidden px-3 py-2 text-left font-medium md:table-cell">Confidence</th>
                    <th className="hidden px-3 py-2 text-left font-medium lg:table-cell">Source</th>
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((f) => (
                    <tr key={f.id} className="cursor-pointer transition-colors hover:bg-secondary/30">
                      <td className="px-3 py-2.5"><SeverityBadge severity={f.severity} /></td>
                      <td className="px-3 py-2.5">
                        <Link href={`/app/findings/${f.id}`} className="block">
                          <div className="font-medium hover:text-primary">{f.title}</div>
                          <div className="font-mono text-xs text-muted-foreground">{f.rule_id}</div>
                        </Link>
                      </td>
                      <td className="hidden px-3 py-2.5 sm:table-cell">
                        <Link href={`/app/findings/${f.id}`} className="font-mono text-xs text-muted-foreground hover:text-foreground">{f.file}:{f.line}</Link>
                      </td>
                      <td className="hidden px-3 py-2.5 md:table-cell"><ConfidenceBar value={f.confidence} /></td>
                      <td className="hidden px-3 py-2.5 lg:table-cell">
                        <div className="flex gap-1">
                          {f.sources.includes('static') && <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px]">static</span>}
                          {f.sources.includes('ai') && <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">ai</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2.5"><StatusBadge status={f.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center">
      <h1 className="text-xl font-semibold">Scan not found</h1>
      <Button asChild><Link href="/app">Back to dashboard</Link></Button>
    </div>
  );
}
