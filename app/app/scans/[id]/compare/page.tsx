'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRightLeft, TrendingDown, TrendingUp, Minus, GitCommit, Plus, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchScan, fetchProject, fetchScans, compareScans } from '@/lib/supabase/data';
import type { Scan, Project } from '@/lib/security/types';

export default function ComparePage({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(true);
  const [scanA, setScanA] = useState<Scan | null>(null);
  const [scanBId, setScanBId] = useState<string>('');
  const [project, setProject] = useState<Project | null>(null);
  const [allScans, setAllScans] = useState<Scan[]>([]);
  const [comp, setComp] = useState<any>(null);

  const load = useCallback(async () => {
    try {
      const a = await fetchScan(params.id);
      if (!a) { setLoading(false); return; }
      setScanA(a);
      const p = await fetchProject(a.project_id);
      if (p) {
        setProject(p);
        const scans = await fetchScans(p.id);
        setAllScans(scans);
        const other = scans.find((s) => s.id !== params.id);
        if (other) setScanBId(other.id);
      }
    } catch {}
    setLoading(false);
  }, [params.id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (scanA && scanBId) {
      compareScans(scanA.id, scanBId).then(setComp).catch(() => setComp(null));
    }
  }, [scanA, scanBId]);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!scanA) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <h1 className="text-xl font-semibold">Scan not found</h1>
        <Button asChild><Link href="/app">Back to dashboard</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        {project && (
          <Link href={`/app/projects/${project.id}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> {project.name}
          </Link>
        )}
      </div>

      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight"><ArrowRightLeft className="h-6 w-6 text-primary" /> Scan Comparison</h1>
        <p className="text-sm text-muted-foreground">Compare findings between two scans</p>
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Scan A (baseline)</label>
              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground"><GitCommit className="h-3 w-3" /> {scanA.commit_sha.slice(0, 7)}</div>
                <div className="mt-1 text-sm">{scanA.findings_count} findings · risk {scanA.risk_score}</div>
                <div className="text-xs text-muted-foreground">{new Date(scanA.started_at).toLocaleString()}</div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Scan B (comparison)</label>
              <Select value={scanBId} onValueChange={setScanBId}>
                <SelectTrigger><SelectValue placeholder="Select a scan" /></SelectTrigger>
                <SelectContent>
                  {allScans.filter((s) => s.id !== scanA.id).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.commit_sha.slice(0, 7)} — {s.findings_count} findings · risk {s.risk_score}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {comp && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Plus} label="New findings" value={`+${comp.newFindings}`} color={comp.newFindings > 0 ? 'severity-critical' : 'severity-low'} />
            <StatCard icon={Minus} label="Resolved findings" value={`-${comp.resolved}`} color={comp.resolved > 0 ? 'severity-low' : 'severity-medium'} />
            <StatCard icon={Minus} label="Unchanged" value={`${comp.unchanged}`} color="severity-medium" />
            <StatCard icon={comp.riskDelta < 0 ? TrendingDown : TrendingUp} label="Risk score change" value={`${comp.riskDelta > 0 ? '+' : ''}${comp.riskDelta}`} color={comp.riskDelta < 0 ? 'severity-low' : comp.riskDelta > 0 ? 'severity-critical' : 'severity-medium'} />
          </div>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">Before & After</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="rounded-lg border border-border p-5">
                  <div className="text-xs text-muted-foreground">Scan A — {new Date(comp.a.started_at).toLocaleDateString()}</div>
                  <div className="mt-2 font-mono text-4xl font-bold">{comp.a.findings_count}</div>
                  <div className="text-sm text-muted-foreground">findings</div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-severity-critical" style={{ width: `${comp.a.risk_score}%` }} /></div>
                  <div className="mt-1 text-xs text-muted-foreground">risk {comp.a.risk_score}/100</div>
                </div>
                <div className="rounded-lg border border-border p-5">
                  <div className="text-xs text-muted-foreground">Scan B — {new Date(comp.b.started_at).toLocaleDateString()}</div>
                  <div className="mt-2 font-mono text-4xl font-bold">{comp.b.findings_count}</div>
                  <div className="text-sm text-muted-foreground">findings</div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-severity-critical" style={{ width: `${comp.b.risk_score}%` }} /></div>
                  <div className="mt-1 text-xs text-muted-foreground">risk {comp.b.risk_score}/100</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" asChild><Link href={`/app/scans/${comp.a.id}`}>View scan A</Link></Button>
            <Button variant="outline" asChild><Link href={`/app/scans/${comp.b.id}`}>View scan B</Link></Button>
          </div>
        </>
      )}

      {!comp && scanBId && (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Unable to compare scans.</CardContent></Card>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">{label}</span><Icon className={`h-4 w-4 text-${color}`} /></div>
        <div className={`mt-2 font-mono text-2xl font-semibold tabular-nums text-${color}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
