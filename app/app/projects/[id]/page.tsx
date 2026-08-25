'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, GitBranch, GitCommit, Plus, Gauge, ShieldCheck, History, FileCode2, ArrowRight, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetchProject, fetchScans, startScan, fetchScorecard, fetchAudit } from '@/lib/supabase/data';
import { getRepo } from '@/lib/security/samples';
import type { Project, Scan, AuditEntry } from '@/lib/security/types';

const CATEGORY_LABELS: Record<string, string> = {
  hardcoded_secret: 'Secrets',
  sql_injection: 'Injection',
  command_injection: 'Injection',
  weak_crypto: 'Cryptography',
  path_traversal: 'Path Traversal',
  ssrf: 'SSRF',
  missing_auth: 'Authentication',
  unsafe_cors: 'Configuration',
  insecure_logging: 'Logging',
  insecure_deserialization: 'Deserialization',
};

export default function ProjectDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [scans, setScans] = useState<Scan[]>([]);
  const [scorecard, setScorecard] = useState<{ overall: number; scores: Record<string, number> } | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [scanning, setScanning] = useState(false);

  const load = useCallback(async () => {
    try {
      const p = await fetchProject(params.id);
      if (!p) { setLoading(false); return; }
      setProject(p);
      const [sc, scs, aud] = await Promise.all([
        fetchScans(p.id),
        fetchScorecard(p.id),
        fetchAudit(p.id),
      ]);
      setScans(sc);
      setScorecard(scs);
      setAudit(aud);
    } catch {}
    setLoading(false);
  }, [params.id]);

  useEffect(() => { load(); }, [load]);

  const handleScan = async () => {
    if (!project) return;
    setScanning(true);
    try {
      const { scanId } = await startScan(project.id);
      router.push(`/app/scans/${scanId}`);
    } catch (e: any) {
      setScanning(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!project) return <NotFound />;

  const repo = getRepo(project.repo_key);

  return (
    <div className="space-y-6">
      <Link href="/app/projects" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> All projects
      </Link>

      <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-4 font-mono text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><GitBranch className="h-3 w-3" /> {project.default_branch}</span>
            <span className="flex items-center gap-1"><FileCode2 className="h-3 w-3" /> {repo?.files.length ?? 0} files</span>
            <span>{project.language}</span>
            {project.repository_url && <span className="truncate max-w-xs">{project.repository_url}</span>}
          </div>
        </div>
        <Button onClick={handleScan} disabled={scanning} size="lg">
          {scanning ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Starting scan...</> : <><Plus className="mr-1 h-4 w-4" /> Start scan</>}
        </Button>
      </div>

      {scorecard && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Gauge className="h-4 w-4" /> Security scorecard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
              <div className="flex flex-col items-center justify-center rounded-lg border border-border p-5">
                <div className="relative h-28 w-28">
                  <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--secondary))" strokeWidth="8" />
                    <circle
                      cx="50" cy="50" r="42" fill="none"
                      stroke={scorecard.overall >= 80 ? 'hsl(168 84% 45%)' : scorecard.overall >= 60 ? 'hsl(38 92% 55%)' : 'hsl(0 72% 56%)'}
                      strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={`${(scorecard.overall / 100) * 264} 264`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-mono text-3xl font-bold">{scorecard.overall}</span>
                    <span className="text-xs text-muted-foreground">/ 100</span>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Overall score</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {Object.entries(scorecard.scores).map(([cat, score]) => (
                  <div key={cat} className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{CATEGORY_LABELS[cat] ?? cat}</span>
                      <span className="font-mono text-sm font-medium">{score}</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${score}%`,
                          background: score >= 80 ? 'hsl(168 84% 45%)' : score >= 60 ? 'hsl(38 92% 55%)' : 'hsl(0 72% 56%)',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <History className="h-4 w-4" /> Scan history
          </CardTitle>
        </CardHeader>
        <CardContent>
          {scans.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <ShieldCheck className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No scans yet. Start your first scan to see findings here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {scans.map((s, i) => (
                <Link
                  key={s.id}
                  href={`/app/scans/${s.id}`}
                  className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:border-primary/30 hover:bg-secondary/30"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-muted-foreground">#{scans.length - i}</span>
                    <div>
                      <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                        <GitCommit className="h-3 w-3" /> {s.commit_sha.slice(0, 7)}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {new Date(s.started_at).toLocaleString()} · {s.files_scanned} files · {s.lines_scanned} lines
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-mono text-sm">{s.findings_count} findings</div>
                      <div className="text-xs text-muted-foreground">{s.risk_score} risk</div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {audit.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Project activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {audit.slice(0, 10).map((a) => (
                <div key={a.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-xs text-primary">{a.action}</span>
                    <span className="text-muted-foreground">{a.detail}</span>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">{new Date(a.timestamp).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center">
      <h1 className="text-xl font-semibold">Project not found</h1>
      <p className="text-sm text-muted-foreground">This project may have been removed.</p>
      <Button asChild><Link href="/app/projects">Back to projects</Link></Button>
    </div>
  );
}
