'use client';

import type { Project, Scan, Finding, AuditEntry, ScanEvent, Workspace, ScanFile } from './types';
import { SAMPLE_REPOS } from './samples';
import { runScan } from './scan';
import { aggregateRisk } from './risk';
import { runAnalyzers } from './analyzers';

const KEY = 'codesentinel.state.v1';

interface State {
  workspace: Workspace;
  projects: Project[];
  scans: Scan[];
  findings: Finding[];
  events: ScanEvent[];
  audit: AuditEntry[];
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function emptyState(): State {
  return {
    workspace: { id: 'ws_demo', name: 'Demo Workspace', owner_id: 'demo', created_at: new Date().toISOString() },
    projects: [],
    scans: [],
    findings: [],
    events: [],
    audit: [],
  };
}

let cache: State | null = null;

function load(): State {
  if (cache) return cache;
  if (typeof window === 'undefined') return emptyState();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      cache = JSON.parse(raw) as State;
      return cache;
    }
  } catch {}
  const s = emptyState();
  cache = s;
  const seeded = seedState();
  cache = seeded;
  save(cache);
  return cache;
}

function save(s: State) {
  cache = s;
  if (typeof window !== 'undefined') {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
  }
}

function audit(project_id: string | null, scan_id: string | null, action: string, detail: string) {
  const s = load();
  s.audit.unshift({
    id: uid(),
    project_id,
    scan_id,
    action,
    detail,
    timestamp: new Date().toISOString(),
  });
  save(s);
}

function seedState(): State {
  const s = emptyState();
  // Seed 3 projects from sample repos with pre-completed scans
  const seeds: { repo: string; scans: { daysAgo: number; findingsStatus: 'open' | 'fixed' }[] }[] = [
    { repo: 'vuln-demo', scans: [{ daysAgo: 7, findingsStatus: 'open' }, { daysAgo: 1, findingsStatus: 'open' }] },
    { repo: 'mixed-demo', scans: [{ daysAgo: 3, findingsStatus: 'open' }] },
    { repo: 'prompt-injection-demo', scans: [{ daysAgo: 2, findingsStatus: 'open' }] },
  ];

  for (const seed of seeds) {
    const repo = SAMPLE_REPOS.find((r) => r.key === seed.repo)!;
    const project: Project = {
      id: uid(),
      workspace_id: s.workspace.id,
      name: repo.name,
      description: repo.description,
      repository_url: `https://github.com/demo/${repo.key}`,
      default_branch: repo.branch,
      language: 'python',
      created_at: new Date(Date.now() - seed.scans.length * 86400000).toISOString(),
      repo_key: repo.key,
    };
    s.projects.push(project);

    for (const sc of seed.scans) {
      const scanId = uid();
      const result = runScan(repo.files, scanId, () => {});
      const started = new Date(Date.now() - sc.daysAgo * 86400000);
      const scan: Scan = {
        id: scanId,
        project_id: project.id,
        status: 'COMPLETED',
        commit_sha: repo.commitSha + sc.daysAgo,
        branch: repo.branch,
        started_at: started.toISOString(),
        completed_at: new Date(started.getTime() + 3200).toISOString(),
        files_scanned: result.filesScanned,
        lines_scanned: result.linesScanned,
        findings_count: result.findings.length,
        risk_score: result.riskScore,
        stage: 'completed',
        progress: 100,
        current_file: null,
      };
      s.scans.push(scan);
      s.events.push(...result.events.map((e) => ({ ...e, scan_id: scanId })));
      const findings = result.findings.map((f) => ({
        ...f,
        scan_id: scanId,
        status: sc.findingsStatus === 'fixed' ? 'FIXED' : f.status,
      }));
      s.findings.push(...findings);
      s.audit.unshift({
        id: uid(),
        project_id: project.id,
        scan_id: scanId,
        action: 'SCAN_COMPLETED',
        detail: `${scan.findings_count} findings on ${project.name}`,
        timestamp: started.toISOString(),
      });
    }
  }
  return s;
}

// ---------- Public API ----------

export function getState(): State {
  return load();
}

export function resetDemo() {
  cache = emptyState();
  save(cache);
  cache = seedState();
  save(cache);
}

export function getProjects(): Project[] {
  return load().projects;
}

export function getProject(id: string): Project | undefined {
  return load().projects.find((p) => p.id === id);
}

export function createProject(input: {
  name: string;
  description: string;
  repoKey: string;
  repositoryUrl?: string;
  branch?: string;
  language?: string;
}): Project {
  const s = load();
  const repo = SAMPLE_REPOS.find((r) => r.key === input.repoKey)!;
  const project: Project = {
    id: uid(),
    workspace_id: s.workspace.id,
    name: input.name,
    description: input.description || repo.description,
    repository_url: input.repositoryUrl || `https://github.com/demo/${repo.key}`,
    default_branch: input.branch || repo.branch,
    language: input.language || 'python',
    created_at: new Date().toISOString(),
    repo_key: input.repoKey,
  };
  s.projects.push(project);
  save(s);
  audit(project.id, null, 'PROJECT_CREATED', `Project ${project.name} created`);
  return project;
}

export function getScans(projectId: string): Scan[] {
  return load().scans.filter((s) => s.project_id === projectId).sort((a, b) => b.started_at.localeCompare(a.started_at));
}

export function getScan(scanId: string): Scan | undefined {
  return load().scans.find((s) => s.id === scanId);
}

export function getScanEvents(scanId: string): ScanEvent[] {
  return load().events.filter((e) => e.scan_id === scanId);
}

export function getFindings(scanId: string): Finding[] {
  return load().findings.filter((f) => f.scan_id === scanId);
}

export function getFinding(id: string): Finding | undefined {
  return load().findings.find((f) => f.id === id);
}

export function getAllFindings(): Finding[] {
  return load().findings;
}

export function updateFindingStatus(id: string, status: Finding['status']) {
  const s = load();
  const f = s.findings.find((x) => x.id === id);
  if (f) {
    f.status = status;
    save(s);
    audit(null, f.scan_id, `FINDING_${status}`, `${f.title} marked ${status}`);
  }
}

export function startScan(projectId: string, onProgress: (scan: Scan) => void): Scan {
  const s = load();
  const project = s.projects.find((p) => p.id === projectId)!;
  const repo = SAMPLE_REPOS.find((r) => r.key === project.repo_key)!;
  const scanId = uid();
  const scan: Scan = {
    id: scanId,
    project_id: projectId,
    status: 'RUNNING',
    commit_sha: repo.commitSha + Math.floor(Math.random() * 999),
    branch: repo.branch,
    started_at: new Date().toISOString(),
    completed_at: null,
    files_scanned: 0,
    lines_scanned: 0,
    findings_count: 0,
    risk_score: 0,
    stage: 'queued',
    progress: 0,
    current_file: null,
  };
  s.scans.unshift(scan);
  save(s);
  audit(projectId, scanId, 'SCAN_STARTED', `Scan started on ${project.name}`);

  // Run scan with progress callback (synchronous but staged)
  const result = runScan(repo.files, scanId, (update) => {
    const idx = s.scans.findIndex((x) => x.id === scanId);
    if (idx >= 0) {
      s.scans[idx] = {
        ...s.scans[idx],
        stage: update.stage,
        progress: update.progress,
        current_file: update.currentFile,
        files_scanned: update.filesScanned,
        findings_count: update.findingsSoFar,
      };
      save(s);
      onProgress(s.scans[idx]);
    }
  });

  // Persist findings + events
  const idx = s.scans.findIndex((x) => x.id === scanId);
  s.scans[idx] = {
    ...s.scans[idx],
    status: 'COMPLETED',
    completed_at: new Date().toISOString(),
    files_scanned: result.filesScanned,
    lines_scanned: result.linesScanned,
    findings_count: result.findings.length,
    risk_score: result.riskScore,
    stage: 'completed',
    progress: 100,
    current_file: null,
  };
  s.findings.push(...result.findings);
  s.events.push(...result.events.map((e) => ({ ...e, scan_id: scanId })));
  save(s);
  audit(projectId, scanId, 'SCAN_COMPLETED', `${result.findings.length} findings, risk ${result.riskScore}`);
  onProgress(s.scans[idx]);
  return s.scans[idx];
}

export function getAudit(projectId?: string): AuditEntry[] {
  const s = load();
  return projectId ? s.audit.filter((a) => a.project_id === projectId) : s.audit;
}

export function getDashboardMetrics() {
  const s = load();
  const projects = s.projects.length;
  const totalScans = s.scans.length;
  const openFindings = s.findings.filter((f) => f.status === 'OPEN' || f.status === 'CONFIRMED').length;
  const critical = s.findings.filter((f) => f.severity === 'CRITICAL' && f.status !== 'FIXED' && f.status !== 'FALSE_POSITIVE').length;
  const risk = s.scans.length > 0
    ? Math.round(s.scans.reduce((sum, sc) => sum + sc.risk_score, 0) / s.scans.length)
    : 0;
  return { projects, totalScans, openFindings, critical, risk };
}

export function getSeverityDistribution() {
  const s = load();
  const open = s.findings.filter((f) => f.status !== 'FIXED' && f.status !== 'FALSE_POSITIVE');
  const counts: Record<string, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
  for (const f of open) counts[f.severity]++;
  return counts;
}

export function getCategoryDistribution() {
  const s = load();
  const open = s.findings.filter((f) => f.status !== 'FIXED' && f.status !== 'FALSE_POSITIVE');
  const counts: Record<string, number> = {};
  for (const f of open) counts[f.category] = (counts[f.category] || 0) + 1;
  return counts;
}

export function getFindingsOverTime() {
  const s = load();
  const byDate: Record<string, number> = {};
  for (const f of s.findings) {
    const d = new Date(f.created_at).toISOString().slice(0, 10);
    byDate[d] = (byDate[d] || 0) + 1;
  }
  return Object.entries(byDate)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({ date, count }));
}

export function getScorecard(projectId: string) {
  const s = load();
  const scans = s.scans.filter((sc) => sc.project_id === projectId);
  if (scans.length === 0) return null;
  const latest = scans.sort((a, b) => b.started_at.localeCompare(a.started_at))[0];
  const findings = s.findings.filter((f) => f.scan_id === latest.id);
  const categories = ['hardcoded_secret', 'sql_injection', 'command_injection', 'weak_crypto', 'path_traversal', 'ssrf', 'missing_auth', 'unsafe_cors', 'insecure_logging', 'insecure_deserialization'];
  const scores: Record<string, number> = {};
  for (const cat of categories) {
    const catFindings = findings.filter((f) => f.category === cat);
    if (catFindings.length === 0) {
      scores[cat] = 100;
    } else {
      const avgRisk = catFindings.reduce((sum, f) => sum + f.risk_score, 0) / catFindings.length;
      scores[cat] = Math.max(0, Math.round(100 - avgRisk));
    }
  }
  const overall = Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / categories.length);
  return { overall, scores, latestScanId: latest.id };
}

export function getRepoFiles(repoKey: string): ScanFile[] {
  const repo = SAMPLE_REPOS.find((r) => r.key === repoKey);
  return repo ? repo.files : [];
}

export function applyPatch(findingId: string): { success: boolean; message: string } {
  const s = load();
  const f = s.findings.find((x) => x.id === findingId);
  if (!f) return { success: false, message: 'Finding not found' };
  if (!f.suggested_patch) return { success: false, message: 'No patch available' };
  f.status = 'FIXED';
  save(s);
  audit(null, f.scan_id, 'PATCH_ACCEPTED', `Patch accepted for ${f.title}`);
  return { success: true, message: 'Patch applied — finding marked as fixed' };
}

export function reanalyzeFinding(findingId: string): { success: boolean; message: string; status: string } {
  const s = load();
  const f = s.findings.find((x) => x.id === findingId);
  if (!f) return { success: false, message: 'Finding not found', status: 'OPEN' };
  // Re-run the analyzer on the file to verify the finding still exists
  const scan = s.scans.find((sc) => sc.id === f.scan_id);
  if (!scan) return { success: false, message: 'Scan not found', status: f.status };
  const project = s.projects.find((p) => p.id === scan.project_id);
  if (!project) return { success: false, message: 'Project not found', status: f.status };
  const repo = SAMPLE_REPOS.find((r) => r.key === project.repo_key);
  if (!repo) return { success: false, message: 'Repository not found', status: f.status };
  const file = repo.files.find((ff) => ff.path === f.file);
  if (!file) return { success: false, message: 'File not found', status: f.status };

  const rawFindings = runAnalyzers(file);
  const stillExists = rawFindings.some((rf) => rf.rule_id === f.rule_id && rf.line === f.line);

  if (f.status === 'FIXED') {
    if (!stillExists) {
      audit(null, f.scan_id, 'REANALYZE_VERIFIED', `Re-analysis confirmed fix for ${f.title}`);
      return { success: true, message: 'Re-analysis confirmed: the vulnerability is resolved.', status: 'FIXED' };
    }
    f.status = 'OPEN';
    save(s);
    audit(null, f.scan_id, 'REANALYZE_REGRESSION', `Re-analysis found regression for ${f.title}`);
    return { success: false, message: 'Re-analysis found the vulnerability still exists.', status: 'OPEN' };
  }
  audit(null, f.scan_id, 'REANALYZE_RUN', `Re-analysis run for ${f.title}`);
  return { success: true, message: 'Re-analysis complete.', status: f.status };
}

export function compareScans(scanAId: string, scanBId: string) {
  const s = load();
  const a = s.scans.find((x) => x.id === scanAId);
  const b = s.scans.find((x) => x.id === scanBId);
  if (!a || !b) return null;
  const fa = s.findings.filter((f) => f.scan_id === scanAId);
  const fb = s.findings.filter((f) => f.scan_id === scanBId);
  const keyA = new Set(fa.map((f) => `${f.rule_id}:${f.file}:${f.line}`));
  const keyB = new Set(fb.map((f) => `${f.rule_id}:${f.file}:${f.line}`));
  const newFindings = fb.filter((f) => !keyA.has(`${f.rule_id}:${f.file}:${f.line}`)).length;
  const resolved = fa.filter((f) => !keyB.has(`${f.rule_id}:${f.file}:${f.line}`)).length;
  const unchanged = fa.filter((f) => keyB.has(`${f.rule_id}:${f.file}:${f.line}`)).length;
  const riskDelta = b.risk_score - a.risk_score;
  return { newFindings, resolved, unchanged, riskDelta, a, b };
}
