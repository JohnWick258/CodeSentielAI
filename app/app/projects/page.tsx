'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Plus, GitBranch, ArrowRight, FileCode2, ShieldAlert, Globe, Code2, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { SAMPLE_REPOS } from '@/lib/security/samples';
import { fetchProjects, createProject, fetchScans } from '@/lib/supabase/data';
import type { Project, Scan } from '@/lib/security/types';

const LANGUAGES = ['python', 'javascript', 'typescript', 'go', 'rust', 'java', 'ruby', 'php', 'csharp', 'cpp'];

export default function ProjectsPage() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<(Project & { scanCount: number; latestRisk: number | null; findingsCount: number })[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [language, setLanguage] = useState('python');
  const [repoKey, setRepoKey] = useState(SAMPLE_REPOS[0].key);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const projs = await fetchProjects();
      const enriched = await Promise.all(
        projs.map(async (p) => {
          const scans = await fetchScans(p.id);
          const latest = scans[0];
          return {
            ...p,
            scanCount: scans.length,
            latestRisk: latest?.risk_score ?? null,
            findingsCount: latest?.findings_count ?? 0,
          };
        })
      );
      setProjects(enriched);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setName('');
    setDesc('');
    setRepoUrl('');
    setBranch('main');
    setLanguage('python');
    setRepoKey(SAMPLE_REPOS[0].key);
    setErrors({});
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Project name is required';
    if (!branch.trim()) e.branch = 'Branch is required';
    if (repoUrl && !/^https?:\/\/.+/.test(repoUrl)) e.repoUrl = 'Enter a valid URL (https://...)';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) return;
    setCreating(true);
    try {
      const p = await createProject({
        name: name.trim(),
        description: desc.trim(),
        repoKey,
        repositoryUrl: repoUrl.trim() || undefined,
        branch: branch.trim(),
        language,
      });
      resetForm();
      setOpen(false);
      window.location.href = `/app/projects/${p.id}`;
    } catch (e: any) {
      setErrors({ name: e.message || 'Failed to create project' });
    }
    setCreating(false);
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) resetForm();
    setOpen(v);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">Create a project and run a security scan</p>
        </div>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-1 h-4 w-4" /> New project</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create a project</DialogTitle>
              <DialogDescription>Fill in the details below to set up your project for security scanning.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="name">Project name <span className="text-severity-critical">*</span></Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="My security project" aria-invalid={!!errors.name} />
                {errors.name && <p className="text-xs text-severity-critical">{errors.name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc">Description</Label>
                <Textarea id="desc" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What does this project do? What are you scanning for?" rows={3} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="repoUrl">Repository URL</Label>
                <div className="relative">
                  <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="repoUrl" value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} placeholder="https://github.com/your-org/your-repo" className="pl-9" aria-invalid={!!errors.repoUrl} />
                </div>
                {errors.repoUrl && <p className="text-xs text-severity-critical">{errors.repoUrl}</p>}
                <p className="text-xs text-muted-foreground">Leave empty to use the sample repository URL.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="branch">Default branch <span className="text-severity-critical">*</span></Label>
                  <div className="relative">
                    <GitBranch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="branch" value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="main" className="pl-9" aria-invalid={!!errors.branch} />
                  </div>
                  {errors.branch && <p className="text-xs text-severity-critical">{errors.branch}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Primary language</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((l) => (
                        <SelectItem key={l} value={l}>
                          <span className="flex items-center gap-2"><Code2 className="h-3.5 w-3.5 text-muted-foreground" />{l}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Sample repository to analyze</Label>
                <Select value={repoKey} onValueChange={setRepoKey}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SAMPLE_REPOS.map((r) => (
                      <SelectItem key={r.key} value={r.key}>
                        <div className="flex flex-col">
                          <span>{r.name}</span>
                          <span className="text-xs text-muted-foreground">{r.files.length} files · {r.description.slice(0, 60)}...</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">The scanner analyzes the selected sample repository's code.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={creating}>Cancel</Button>
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Creating...</> : 'Create project'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => {
          const repo = SAMPLE_REPOS.find((r) => r.key === p.repo_key);
          return (
            <Card key={p.id} className="group flex flex-col transition-colors hover:border-primary/30">
              <CardContent className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileCode2 className="h-4.5 w-4.5" />
                  </div>
                  {p.latestRisk !== null && (
                    <div className="text-right">
                      <div className="font-mono text-lg font-semibold">{p.latestRisk}</div>
                      <div className="text-xs text-muted-foreground">risk</div>
                    </div>
                  )}
                </div>
                <h3 className="mt-3 font-medium">{p.name}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3 font-mono text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><GitBranch className="h-3 w-3" /> {p.default_branch}</span>
                  <span>{repo?.files.length ?? 0} files</span>
                  <span className="capitalize">{p.language}</span>
                  {p.findingsCount > 0 && <span className="flex items-center gap-1"><ShieldAlert className="h-3 w-3" /> {p.findingsCount} findings</span>}
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                  <span className="text-xs text-muted-foreground">{p.scanCount} scan{p.scanCount !== 1 ? 's' : ''}</span>
                  <Button size="sm" variant="ghost" asChild>
                    <Link href={`/app/projects/${p.id}`}>Open <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
