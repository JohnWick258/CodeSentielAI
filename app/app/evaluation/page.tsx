'use client';

import { useEffect, useState } from 'react';
import { FlaskConical, Play, CheckCircle2, XCircle, AlertTriangle, Clock, TrendingUp, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { runEvaluation, type EvalMetrics } from '@/lib/security/eval';

export default function EvaluationPage() {
  const [mounted, setMounted] = useState(false);
  const [metrics, setMetrics] = useState<EvalMetrics | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleRun = () => {
    setRunning(true);
    setTimeout(() => {
      const result = runEvaluation();
      setMetrics(result);
      setRunning(false);
    }, 50);
  };

  if (!mounted) return <div className="h-8 w-40 rounded shimmer" />;

  const precisionPct = metrics ? Math.round(metrics.precision * 100) : 0;
  const recallPct = metrics ? Math.round(metrics.recall * 100) : 0;
  const fprPct = metrics ? Math.round(metrics.falsePositiveRate * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <FlaskConical className="h-6 w-6 text-primary" /> AI Evaluation
          </h1>
          <p className="text-sm text-muted-foreground">Measurable metrics from a 36-case evaluation dataset</p>
        </div>
        <Button onClick={handleRun} disabled={running}>
          {running ? 'Running evaluation…' : <><Play className="mr-1 h-4 w-4" /> Run evaluation</>}
        </Button>
      </div>

      {!metrics && !running && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <Target className="h-10 w-10 text-muted-foreground" />
            <div>
              <h3 className="font-medium">Run the evaluation to see metrics</h3>
              <p className="mt-1 text-sm text-muted-foreground">The dataset includes 20 vulnerable, 10 safe, and 6 ambiguous cases.</p>
            </div>
            <Button onClick={handleRun}><Play className="mr-1 h-4 w-4" /> Run evaluation</Button>
          </CardContent>
        </Card>
      )}

      {running && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Running 36 test cases through the analyzer…</p>
          </CardContent>
        </Card>
      )}

      {metrics && (
        <>
          {/* Metrics grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard icon={Target} label="Precision" value={`${precisionPct}%`} accent={precisionPct >= 90 ? 'severity-low' : 'severity-medium'} />
            <MetricCard icon={TrendingUp} label="Recall" value={`${recallPct}%`} accent={recallPct >= 90 ? 'severity-low' : 'severity-medium'} />
            <MetricCard icon={AlertTriangle} label="False Positive Rate" value={`${fprPct}%`} accent={fprPct <= 10 ? 'severity-low' : 'severity-critical'} />
            <MetricCard icon={Clock} label="Total Latency" value={`${metrics.latencyMs}ms`} />
          </div>

          {/* Confusion matrix */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Confusion matrix</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MatrixCell label="True Positives" value={metrics.truePositives} color="severity-low" />
                <MatrixCell label="False Positives" value={metrics.falsePositives} color="severity-critical" />
                <MatrixCell label="True Negatives" value={metrics.trueNegatives} color="severity-low" />
                <MatrixCell label="False Negatives" value={metrics.falseNegatives} color="severity-high" />
              </div>
            </CardContent>
          </Card>

          {/* Per-case results */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Per-case results ({metrics.total} cases)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                    <tr className="border-b border-border">
                      <th className="px-3 py-2 text-left font-medium">ID</th>
                      <th className="px-3 py-2 text-left font-medium">Label</th>
                      <th className="hidden px-3 py-2 text-left font-medium sm:table-cell">Expected</th>
                      <th className="px-3 py-2 text-left font-medium">Found</th>
                      <th className="hidden px-3 py-2 text-left font-medium md:table-cell">Confidence</th>
                      <th className="hidden px-3 py-2 text-left font-medium lg:table-cell">Latency</th>
                      <th className="px-3 py-2 text-left font-medium">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {metrics.perCase.map((c) => (
                      <tr key={c.id} className="hover:bg-secondary/30">
                        <td className="px-3 py-2 font-mono text-xs text-primary">{c.id}</td>
                        <td className="px-3 py-2">{c.label}</td>
                        <td className="hidden px-3 py-2 sm:table-cell">
                          <span className={c.expected ? 'text-severity-critical' : 'text-severity-low'}>
                            {c.expected ? 'vulnerable' : 'safe'}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">{c.found}</td>
                        <td className="hidden px-3 py-2 md:table-cell font-mono text-xs text-muted-foreground">{Math.round(c.confidence * 100)}%</td>
                        <td className="hidden px-3 py-2 lg:table-cell font-mono text-xs text-muted-foreground">{c.latencyMs}ms</td>
                        <td className="px-3 py-2">
                          {c.correct ? (
                            <span className="flex items-center gap-1 text-severity-low"><CheckCircle2 className="h-3.5 w-3.5" /> correct</span>
                          ) : (
                            <span className="flex items-center gap-1 text-severity-critical"><XCircle className="h-3.5 w-3.5" /> wrong</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Methodology note */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Methodology</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">
                The evaluation dataset contains {metrics.total} cases: 20 vulnerable snippets, 10 safe snippets, and 6 ambiguous cases.
                Precision measures the fraction of reported findings that are real. Recall measures the fraction of real
                vulnerabilities that were detected. LLM reasoning is probabilistic — these metrics are computed from
                deterministic analyzer output against a labeled dataset, not from the AI assessment layer.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{label}</span>
          <Icon className={`h-4 w-4 ${accent ? `text-${accent}` : 'text-muted-foreground'}`} />
        </div>
        <div className="mt-2 font-mono text-2xl font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}

function MatrixCell({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg border border-border p-4 text-center">
      <div className={`font-mono text-3xl font-bold text-${color}`}>{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
