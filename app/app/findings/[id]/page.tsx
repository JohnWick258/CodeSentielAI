'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Brain, Cpu, ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Eye, GitBranch, Zap, RotateCw, FileCode2, Network, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SeverityBadge, StatusBadge, ConfidenceBar } from '@/components/severity';
import { fetchFinding, fetchScan, fetchProject, updateFindingStatus, applyPatch, reanalyzeFinding } from '@/lib/supabase/data';
import { getRepo } from '@/lib/security/samples';
import type { Finding, Scan, Project, ScanFile } from '@/lib/security/types';

export default function FindingDetail({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(true);
  const [finding, setFinding] = useState<Finding | null>(null);
  const [scan, setScan] = useState<Scan | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [file, setFile] = useState<ScanFile | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const f = await fetchFinding(params.id);
      if (!f) { setLoading(false); return; }
      setFinding(f);
      const sc = await fetchScan(f.scan_id);
      if (sc) {
        setScan(sc);
        const p = await fetchProject(sc.project_id);
        if (p) {
          setProject(p);
          const repo = getRepo(p.repo_key);
          setFile(repo?.files.find((ff) => ff.path === f.file) ?? null);
        }
      }
    } catch {}
    setLoading(false);
  }, [params.id]);

  useEffect(() => { load(); }, [load]);

  const refresh = useCallback(async () => {
    const f = await fetchFinding(params.id);
    if (f) setFinding({ ...f });
  }, [params.id]);

  const handleStatus = async (status: Finding['status']) => {
    try {
      await updateFindingStatus(params.id, status);
      setToast({ type: 'info', msg: `Finding marked as ${status.toLowerCase().replace('_', ' ')}` });
      refresh();
      setTimeout(() => setToast(null), 3000);
    } catch (e: any) {
      setToast({ type: 'error', msg: e.message });
    }
  };

  const handleApplyPatch = async () => {
    try {
      const result = await applyPatch(params.id);
      setToast({ type: result.success ? 'success' : 'error', msg: result.message });
      refresh();
      setTimeout(() => setToast(null), 4000);
    } catch (e: any) {
      setToast({ type: 'error', msg: e.message });
    }
  };

  const handleReanalyze = async () => {
    try {
      const result = await reanalyzeFinding(params.id);
      setToast({ type: result.success ? 'success' : 'error', msg: result.message });
      refresh();
      setTimeout(() => setToast(null), 4000);
    } catch (e: any) {
      setToast({ type: 'error', msg: e.message });
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!finding) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <h1 className="text-xl font-semibold">Finding not found</h1>
        <Button asChild><Link href="/app">Back to dashboard</Link></Button>
      </div>
    );
  }

  const ai = finding.ai_explanation;
  const lines = file ? file.content.split('\n') : [];
  const startLine = Math.max(1, finding.line - 3);
  const endLine = Math.min(lines.length, finding.endLine + 3);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {project && <Link href={`/app/projects/${project.id}`} className="hover:text-foreground">{project.name}</Link>}
        <span>/</span>
        {scan && <Link href={`/app/scans/${scan.id}`} className="hover:text-foreground">Scan</Link>}
        <span>/</span>
        <span className="text-foreground">Finding</span>
      </div>

      {toast && (
        <div className={`fixed right-4 top-20 z-50 max-w-sm rounded-lg border p-4 shadow-lg animate-slide-in-right ${
          toast.type === 'success' ? 'border-severity-low/30 bg-card text-foreground' :
          toast.type === 'error' ? 'border-severity-critical/30 bg-card text-foreground' :
          'border-primary/30 bg-card text-foreground'
        }`}>
          <div className="flex items-start gap-2">
            {toast.type === 'success' && <CheckCircle2 className="h-4 w-4 text-severity-low mt-0.5" />}
            {toast.type === 'error' && <XCircle className="h-4 w-4 text-severity-critical mt-0.5" />}
            {toast.type === 'info' && <AlertTriangle className="h-4 w-4 text-primary mt-0.5" />}
            <span className="text-sm">{toast.msg}</span>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <SeverityBadge severity={finding.severity} />
            <StatusBadge status={finding.status} />
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">{finding.title}</h1>
          <p className="mt-1 font-mono text-sm text-muted-foreground">{finding.file}:{finding.line}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleReanalyze}><RotateCw className="mr-1 h-3.5 w-3.5" /> Re-analyze</Button>
          <Button variant="outline" size="sm" onClick={() => handleStatus('CONFIRMED')}><CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Confirm</Button>
          <Button variant="outline" size="sm" onClick={() => handleStatus('FALSE_POSITIVE')}><XCircle className="mr-1 h-3.5 w-3.5" /> False positive</Button>
          <Button variant="outline" size="sm" onClick={() => handleStatus('IGNORED')}><Eye className="mr-1 h-3.5 w-3.5" /> Ignore</Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><FileCode2 className="h-4 w-4" /> Vulnerable code</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-border bg-background">
            <pre className="p-4 font-mono text-xs leading-relaxed">
              {lines.slice(startLine - 1, endLine).map((l, i) => {
                const lineNo = startLine + i;
                const isVuln = lineNo >= finding.line && lineNo <= finding.endLine;
                return (
                  <div key={i} className={`flex ${isVuln ? 'bg-severity-critical/10' : ''}`}>
                    <span className="w-10 shrink-0 select-none pr-3 text-right text-muted-foreground/50">{lineNo}</span>
                    <span className={`whitespace-pre ${isVuln ? 'text-severity-critical' : 'text-foreground/80'}`}>{l || ' '}</span>
                  </div>
                );
              })}
            </pre>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><AlertTriangle className="h-4 w-4" /> Why this matters</CardTitle>
        </CardHeader>
        <CardContent><p className="text-sm leading-relaxed text-muted-foreground">{finding.description}</p></CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {ai && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Network className="h-4 w-4" /> Attack path</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-1">
                {ai.attack_path.map((step: string, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 font-mono text-xs text-primary">{i + 1}</span>
                    <span className="text-sm text-muted-foreground">{step}</span>
                    {i < ai.attack_path.length - 1 && <span className="ml-auto text-muted-foreground/30">↓</span>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        {ai && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><ShieldCheck className="h-4 w-4" /> Evidence</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {ai.evidence.map((e: any, i: number) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-severity-low" />
                    <div><div className="text-sm font-medium">{e.label}</div><div className="font-mono text-xs text-muted-foreground">{e.detail}</div></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {ai && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Brain className="h-4 w-4 text-primary" /> AI Assessment</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">Confidence</span><ConfidenceBar value={ai.confidence} /></div>
              <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">Severity</span><SeverityBadge severity={ai.severity} /></div>
              <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">Valid</span>
                <span className={`flex h-5 w-5 items-center justify-center rounded-full ${ai.is_valid ? 'bg-severity-critical/15 text-severity-critical' : 'bg-severity-low/15 text-severity-low'}`}>{ai.is_valid ? '!' : '✓'}</span>
              </div>
            </div>
            <Separator />
            <div><div className="mb-1 text-xs font-medium text-muted-foreground">Reasoning</div><p className="text-sm leading-relaxed">{ai.reasoning}</p></div>
            {ai.false_positive_reason && (
              <div className="rounded-lg border border-border bg-secondary/30 p-3"><div className="mb-1 text-xs font-medium text-muted-foreground">False positive consideration</div><p className="text-sm">{ai.false_positive_reason}</p></div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Zap className="h-4 w-4" /> Recommended fix</CardTitle></CardHeader>
        <CardContent><p className="text-sm leading-relaxed text-muted-foreground">{finding.remediation}</p></CardContent>
      </Card>

      {finding.suggested_patch && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><GitBranch className="h-4 w-4" /> Suggested patch</CardTitle>
              {finding.status !== 'FIXED' && <Button size="sm" onClick={handleApplyPatch}><CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Apply patch</Button>}
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border border-border bg-background">
              <pre className="p-4 font-mono text-xs leading-relaxed">
                {finding.suggested_patch.split('\n').map((l, i) => (
                  <div key={i} className={`whitespace-pre ${l.startsWith('+') && !l.startsWith('+++') ? 'text-severity-low' : l.startsWith('-') && !l.startsWith('---') ? 'text-severity-critical' : 'text-muted-foreground'}`}>{l || ' '}</div>
                ))}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">Detection sources</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {finding.sources.includes('static') && (
              <div className="flex items-center gap-2 rounded-lg border border-border p-3"><Cpu className="h-4 w-4 text-primary" /><div><div className="text-sm font-medium">AST Analyzer</div><div className="text-xs text-muted-foreground">{finding.rule_id}</div></div><CheckCircle2 className="h-4 w-4 text-severity-low" /></div>
            )}
            {finding.sources.includes('ai') && (
              <div className="flex items-center gap-2 rounded-lg border border-border p-3"><Brain className="h-4 w-4 text-primary" /><div><div className="text-sm font-medium">AI Reasoning</div><div className="text-xs text-muted-foreground">Grounded assessment</div></div><CheckCircle2 className="h-4 w-4 text-severity-low" /></div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">Actions</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => handleStatus('FIXED')}><CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Mark Fixed</Button>
            <Button variant="outline" onClick={() => handleStatus('FALSE_POSITIVE')}><XCircle className="mr-1 h-3.5 w-3.5" /> False Positive</Button>
            <Button variant="outline" onClick={() => handleStatus('IGNORED')}><Eye className="mr-1 h-3.5 w-3.5" /> Ignore</Button>
            <Button variant="outline" onClick={handleReanalyze}><RotateCw className="mr-1 h-3.5 w-3.5" /> Re-analyze</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
