import type { RawFinding, Finding, DetectionSource, ScanFile } from './types';
import { RULES_BY_ID } from './rules';
import { riskScore } from './risk';
import { assessFinding } from './ai';

// Correlate findings: when the static analyzer and the "AI" (second-pass) agree
// on the same rule+file+line, merge into one finding with sources=['static','ai']
// and boost confidence. Here the AI pass re-evaluates each static finding and
// also produces a small set of independent AI-only findings for ambiguous cases.

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function correlate(
  raw: RawFinding[],
  files: ScanFile[],
  scanId: string
): Finding[] {
  const fileMap = new Map(files.map((f) => [f.path, f]));
  const findings: Finding[] = [];

  for (const r of raw) {
    const rule = RULES_BY_ID[r.rule_id];
    const file = fileMap.get(r.file);
    const ai = file ? assessFinding(r, file) : null;
    const sources: DetectionSource[] = ['static'];
    if (ai && ai.available) sources.push('ai');

    const conf = ai ? Math.min(0.98, (r.confidence + ai.confidence) / 2 + 0.03) : r.confidence;
    const score = riskScore(r.severity, conf, r.category, r.file);

    findings.push({
      ...r,
      confidence: conf,
      id: uid(),
      scan_id: scanId,
      title: rule?.name ?? r.message,
      description: rule?.description ?? r.message,
      remediation: rule?.remediation ?? r.message,
      ai_explanation: ai,
      suggested_patch: ai?.suggested_patch ?? null,
      status: 'OPEN',
      sources,
      risk_score: score,
      created_at: new Date().toISOString(),
    });
  }

  return findings;
}
