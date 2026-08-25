import type { Severity, Confidence } from './types';

const SEVERITY_WEIGHT: Record<Severity, number> = {
  CRITICAL: 1.0,
  HIGH: 0.8,
  MEDIUM: 0.55,
  LOW: 0.3,
  INFO: 0.15,
};

const SEVERITY_RANK: Record<Severity, number> = {
  CRITICAL: 5,
  HIGH: 4,
  MEDIUM: 3,
  LOW: 2,
  INFO: 1,
};

// Exploitability heuristics by category — how directly reachable the issue is
const EXPLOITABILITY: Record<string, number> = {
  command_injection: 0.95,
  sql_injection: 0.9,
  insecure_deserialization: 0.95,
  hardcoded_secret: 0.7,
  path_traversal: 0.82,
  ssrf: 0.78,
  missing_auth: 0.75,
  unsafe_cors: 0.55,
  weak_crypto: 0.45,
  insecure_logging: 0.4,
};

// Exposure: how exposed the file appears to be (route/main/app files more exposed)
function exposureFor(file: string): number {
  const f = file.toLowerCase();
  if (/(^|\/)(app|main|server|api|routes|views|controllers)\b/.test(f)) return 0.9;
  if (/(^|\/)(models|services|db|database|handlers)\b/.test(f)) return 0.7;
  if (/test|spec|mock|fixture/.test(f)) return 0.25;
  if (/(^|\/)(utils|helpers|lib)\b/.test(f)) return 0.55;
  return 0.6;
}

export function riskScore(
  severity: Severity,
  confidence: Confidence,
  category: string,
  file: string
): number {
  const sev = SEVERITY_WEIGHT[severity] ?? 0.5;
  const conf = Math.max(0, Math.min(1, confidence));
  const expl = EXPLOITABILITY[category] ?? 0.6;
  const exp = exposureFor(file);
  // Risk = Severity * Confidence * Exploitability * Exposure, scaled to 0..100
  const raw = sev * conf * expl * exp;
  return Math.round(raw * 100);
}

export function riskBand(score: number): { band: string; color: string } {
  if (score >= 81) return { band: 'CRITICAL', color: 'severity-critical' };
  if (score >= 61) return { band: 'HIGH', color: 'severity-high' };
  if (score >= 41) return { band: 'ELEVATED', color: 'severity-medium' };
  if (score >= 21) return { band: 'MODERATE', color: 'severity-low' };
  return { band: 'LOW', color: 'severity-info' };
}

export function severityRank(s: Severity): number {
  return SEVERITY_RANK[s] ?? 0;
}

export function severityColor(s: Severity): string {
  switch (s) {
    case 'CRITICAL': return 'severity-critical';
    case 'HIGH': return 'severity-high';
    case 'MEDIUM': return 'severity-medium';
    case 'LOW': return 'severity-low';
    default: return 'severity-info';
  }
}

export function aggregateRisk(scores: number[]): number {
  if (scores.length === 0) return 0;
  // Take a weighted top-finding approach: max + average of top 5
  const sorted = [...scores].sort((a, b) => b - a);
  const top = sorted.slice(0, 5);
  const max = sorted[0] ?? 0;
  const avg = top.reduce((s, n) => s + n, 0) / top.length;
  return Math.round(0.6 * max + 0.4 * avg);
}
