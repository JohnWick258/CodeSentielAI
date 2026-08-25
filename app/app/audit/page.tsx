'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { BookText, ShieldCheck, GitCommit, Plus, AlertTriangle, CheckCircle2, Eye, XCircle, RotateCw, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchAudit, fetchProjects } from '@/lib/supabase/data';
import type { AuditEntry, Project } from '@/lib/security/types';

const ACTION_ICONS: Record<string, any> = {
  USER_LOGIN: ShieldCheck,
  PROJECT_CREATED: Plus,
  PROJECT_DELETED: XCircle,
  SCAN_STARTED: GitCommit,
  SCAN_COMPLETED: CheckCircle2,
  SCAN_FAILED: AlertTriangle,
  FINDING_CONFIRMED: CheckCircle2,
  FINDING_IGNORED: Eye,
  FINDING_FALSE_POSITIVE: XCircle,
  FINDING_FIXED: CheckCircle2,
  FINDING_OPEN: AlertTriangle,
  PATCH_ACCEPTED: CheckCircle2,
  REANALYZE_RUN: RotateCw,
  REANALYZE_VERIFIED: CheckCircle2,
  REANALYZE_REGRESSION: AlertTriangle,
};

export default function AuditPage() {
  const [loading, setLoading] = useState(true);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const load = useCallback(async () => {
    try {
      const [a, p] = await Promise.all([fetchAudit(), fetchProjects()]);
      setAudit(a);
      setProjects(p);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const projectName = (id: string | null) => projects.find((p) => p.id === id)?.name;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight"><BookText className="h-6 w-6 text-primary" /> Audit Log</h1>
        <p className="text-sm text-muted-foreground">All security-relevant actions across the workspace</p>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">{audit.length} events</CardTitle></CardHeader>
        <CardContent>
          {audit.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <ShieldCheck className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No audit events yet.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {audit.map((a) => {
                const Icon = ACTION_ICONS[a.action] ?? ShieldCheck;
                return (
                  <div key={a.id} className="flex items-center gap-3 rounded-lg p-3 hover:bg-secondary/30">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-4 w-4" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-xs text-primary">{a.action}</span>
                        {a.project_id && projectName(a.project_id) && (
                          <Link href={`/app/projects/${a.project_id}`} className="truncate text-xs text-muted-foreground hover:text-foreground">{projectName(a.project_id)}</Link>
                        )}
                      </div>
                      <div className="mt-0.5 truncate text-sm text-muted-foreground">{a.detail}</div>
                    </div>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">{new Date(a.timestamp).toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
