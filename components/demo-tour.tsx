'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Play, Pause, X, ChevronLeft, ChevronRight, RotateCcw,
  LayoutDashboard, FolderGit2, GitBranch, ShieldAlert, Brain,
  FileCode2, Zap, Eye, CheckCircle2, ArrowRight, Gauge,
  FlaskConical, BookText, Network, Cpu, KeyRound, Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { resetDemoData } from '@/lib/supabase/data';

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: any;
  highlights: string[];
  route?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to CodeSentinel AI',
    description: 'An AI-powered code security analyzer that combines deterministic rules with AI reasoning. Every finding is grounded in evidence, attack paths, and verified patches. Let us walk you through the full workflow.',
    icon: ShieldAlert,
    highlights: ['Deterministic + AI analysis', 'Evidence-first findings', 'Verifiable patches'],
  },
  {
    id: 'dashboard',
    title: 'Dashboard — Security Overview',
    description: 'The dashboard gives you a bird\'s-eye view of your security posture. Track project count, total scans, open findings, and critical vulnerabilities. Charts show severity distribution, vulnerability categories, and findings over time.',
    icon: LayoutDashboard,
    highlights: ['Risk score at a glance', 'Severity pie chart', 'Category bar chart', 'Findings trend line', 'Detection source breakdown'],
    route: '/app',
  },
  {
    id: 'projects',
    title: 'Projects — Create & Manage',
    description: 'Create a project by filling in all the details: name, description, repository URL, branch, primary language, and which sample repository to scan. Each project card shows the latest risk score, file count, and scan history.',
    icon: FolderGit2,
    highlights: ['Full project details form', 'Repository URL & branch', 'Language selection', 'Risk score per project', 'Scan count tracking'],
    route: '/app/projects',
  },
  {
    id: 'scan',
    title: 'Scanning — Multi-Stage Pipeline',
    description: 'When you start a scan, it runs through a real multi-stage pipeline: ingestion, file discovery, AST analysis, secret detection, AI analysis, correlation, risk scoring, and report generation. Watch progress animate through each stage.',
    icon: Cpu,
    highlights: ['10-stage pipeline', 'Real progress animation', 'File-by-file scanning', 'Static + AI + secret detection', 'Finding correlation'],
  },
  {
    id: 'findings',
    title: 'Findings — Evidence & AI Assessment',
    description: 'Each finding shows the vulnerable code with line highlighting, explains why it matters, maps the attack path step-by-step, and provides an AI assessment with confidence, reasoning, and false-positive considerations.',
    icon: Brain,
    highlights: ['Vulnerable code with highlights', 'Attack path visualization', 'AI reasoning & confidence', 'Evidence list', 'False positive analysis'],
  },
  {
    id: 'patch',
    title: 'Patches — Apply & Verify',
    description: 'Every finding includes a suggested patch you can inspect. Apply it with one click to mark the finding as fixed, then re-analyze to verify the vulnerability is truly resolved. The scanner re-runs the analyzer to confirm.',
    icon: Zap,
    highlights: ['Suggested diff with syntax', 'One-click apply', 'Re-analyze to verify', 'Regression detection', 'Audit trail'],
  },
  {
    id: 'compare',
    title: 'Scan Comparison — Track Progress',
    description: 'Compare any two scans to see new findings, resolved findings, and risk score changes side by side. Track whether your security posture is improving over time.',
    icon: GitBranch,
    highlights: ['Before & after view', 'New vs resolved findings', 'Risk score delta', 'Unchanged findings count'],
  },
  {
    id: 'evaluation',
    title: 'AI Evaluation — Measured Accuracy',
    description: 'Run the evaluation suite against a 36-case labeled dataset. See precision, recall, false positive rate, and a full confusion matrix. Every metric is computed from deterministic output against ground truth.',
    icon: FlaskConical,
    highlights: ['36-case dataset', 'Precision & recall', 'False positive rate', 'Confusion matrix', 'Per-case results'],
    route: '/app/evaluation',
  },
  {
    id: 'audit',
    title: 'Audit Log — Full Traceability',
    description: 'Every action — project creation, scan start, finding status changes, patch acceptance, re-analysis — is logged with a timestamp. Full traceability for compliance and debugging.',
    icon: BookText,
    highlights: ['All security actions logged', 'Timestamped entries', 'Project-scoped filtering', 'Action-specific icons'],
    route: '/app/audit',
  },
  {
    id: 'ready',
    title: 'You are ready to explore',
    description: 'That is the full workflow: create a project, run a scan, review findings with AI explanations, apply patches, compare scans, check evaluation metrics, and audit everything. The demo workspace is pre-loaded with 3 projects and 4 scans. Start exploring!',
    icon: CheckCircle2,
    highlights: ['3 pre-loaded projects', '4 completed scans', '20+ findings to explore', 'Try it yourself now'],
  },
];

export function DemoTour({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const step = TOUR_STEPS[stepIndex];
  const totalSteps = TOUR_STEPS.length;
  const STEP_DURATION = 7000;

  const navigateToRoute = useCallback((route?: string) => {
    if (route) {
      router.push(route);
    }
  }, [router]);

  const goNext = useCallback(() => {
    setProgress(0);
    setStepIndex((prev) => {
      const next = Math.min(prev + 1, totalSteps - 1);
      navigateToRoute(TOUR_STEPS[next].route);
      return next;
    });
  }, [totalSteps, navigateToRoute]);

  const goPrev = useCallback(() => {
    setProgress(0);
    setStepIndex((prev) => {
      const prevIdx = Math.max(prev - 1, 0);
      navigateToRoute(TOUR_STEPS[prevIdx].route);
      return prevIdx;
    });
  }, [navigateToRoute]);

  const restart = useCallback(() => {
    setProgress(0);
    setStepIndex(0);
    resetDemoData().catch(() => {});
    navigateToRoute('/app');
  }, [navigateToRoute]);

  // Auto-advance timer
  useEffect(() => {
    if (!playing) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    if (stepIndex === 0) {
      resetDemoData().catch(() => {});
      navigateToRoute('/app');
    }

    timerRef.current = setInterval(() => {
      setProgress((p) => {
        const newP = p + 100 / (STEP_DURATION / 50);
        if (newP >= 100) {
          if (stepIndex < totalSteps - 1) {
            goNext();
          } else {
            setPlaying(false);
          }
          return 0;
        }
        return newP;
      });
    }, 50);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [playing, stepIndex, totalSteps, goNext, navigateToRoute]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'Escape') onClose();
      else if (e.key === ' ') {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goNext, goPrev, onClose]);

  const Icon = step.icon;
  const isLast = stepIndex === totalSteps - 1;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md shadow-2xl">
      {/* Progress bar */}
      <div className="h-1 w-full bg-muted">
        <div
          className="h-full bg-primary transition-all duration-50 ease-linear"
          style={{ width: `${(stepIndex / totalSteps) * 100 + (progress / totalSteps)}%` }}
        />
      </div>

      <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Icon className="h-6 w-6" />
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">{stepIndex + 1} / {totalSteps}</span>
                <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-[10px] text-primary">{step.id}</span>
              </div>
              <button
                onClick={onClose}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                aria-label="Close demo tour"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <h3 className="mt-1.5 text-base font-semibold">{step.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.description}</p>

            {/* Highlights */}
            <div className="mt-3 flex flex-wrap gap-2">
              {step.highlights.map((h) => (
                <span
                  key={h}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/50 px-2 py-1 text-xs text-muted-foreground"
                >
                  <CheckCircle2 className="h-3 w-3 text-primary" />
                  {h}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={goPrev}
              disabled={stepIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPlaying((p) => !p)}
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {playing ? 'Pause' : 'Play'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={goNext}
              disabled={isLast}
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={restart}>
              <RotateCcw className="h-4 w-4" /> Restart
            </Button>
            {isLast && (
              <Button size="sm" onClick={onClose}>
                <CheckCircle2 className="mr-1 h-4 w-4" /> Done
              </Button>
            )}
          </div>
        </div>

        {/* Step dots */}
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {TOUR_STEPS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => {
                setProgress(0);
                setStepIndex(i);
                navigateToRoute(s.route);
              }}
              className={`h-1.5 rounded-full transition-all ${
                i === stepIndex ? 'w-8 bg-primary' : i < stepIndex ? 'w-1.5 bg-primary/40' : 'w-1.5 bg-muted'
              }`}
              aria-label={`Go to step ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
