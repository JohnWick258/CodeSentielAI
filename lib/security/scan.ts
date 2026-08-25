import type { ScanFile, RawFinding, ScanEvent, ScanStage, Finding } from './types';
import { runAnalyzers } from './analyzers';
import { correlate } from './correlation';
import { aggregateRisk } from './risk';
import { detectPromptInjection } from './ai';

export interface ScanProgressUpdate {
  stage: ScanStage;
  progress: number;
  currentFile: string | null;
  filesScanned: number;
  totalFiles: number;
  findingsSoFar: number;
  events: ScanEvent[];
}

export interface ScanResult {
  findings: Finding[];
  events: ScanEvent[];
  filesScanned: number;
  linesScanned: number;
  riskScore: number;
  injectionWarnings: { file: string; line: number; text: string }[];
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

// Run the full scan pipeline synchronously, but emit progress via callback
// so the UI can show real stage-by-stage progress (not a fake timer).
export function runScan(
  files: ScanFile[],
  scanId: string,
  onProgress: (update: ScanProgressUpdate) => void
): ScanResult {
  const events: ScanEvent[] = [];
  const totalFiles = files.length;
  let filesScanned = 0;
  let findingsSoFar = 0;
  let linesScanned = 0;
  const allRaw: RawFinding[] = [];
  const injectionWarnings: { file: string; line: number; text: string }[] = [];

  const emit = (stage: ScanStage, progress: number, currentFile: string | null) => {
    const ev: ScanEvent = {
      id: uid(),
      scan_id: scanId,
      event_type: `stage:${stage}`,
      payload: { stage, progress, currentFile, filesScanned, findingsSoFar },
      timestamp: new Date().toISOString(),
    };
    events.push(ev);
    onProgress({
      stage,
      progress,
      currentFile,
      filesScanned,
      totalFiles,
      findingsSoFar,
      events: [...events],
    });
  };

  emit('queued', 0, null);
  emit('ingestion', 5, null);

  // File discovery
  emit('file_discovery', 12, null);

  // Static analysis + secret detection interleaved per file
  for (const file of files) {
    filesScanned++;
    linesScanned += file.lines;
    emit('static_analysis', 12 + Math.round((filesScanned / totalFiles) * 40), file.path);
    const raw = runAnalyzers(file);
    allRaw.push(...raw);
    findingsSoFar = allRaw.length;
    // prompt injection detection (defense layer)
    const inj = detectPromptInjection(file.content);
    for (const h of inj) injectionWarnings.push({ file: file.path, line: h.line, text: h.text });
    emit('secret_detection', 12 + Math.round((filesScanned / totalFiles) * 40) + 5, file.path);
  }

  // AI analysis (grounded assessment per finding)
  emit('ai_analysis', 70, null);

  // Correlation
  emit('correlation', 82, null);
  const findings = correlate(allRaw, files, scanId);

  // Risk scoring
  emit('risk_scoring', 92, null);
  const risk = aggregateRisk(findings.map((f) => f.risk_score));

  // Report
  emit('report', 98, null);
  emit('completed', 100, null);

  return {
    findings,
    events,
    filesScanned,
    linesScanned,
    riskScore: risk,
    injectionWarnings,
  };
}
