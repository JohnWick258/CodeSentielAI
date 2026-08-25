export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
export type Confidence = number; // 0..1
export type FindingStatus = 'OPEN' | 'CONFIRMED' | 'FALSE_POSITIVE' | 'FIXED' | 'IGNORED';
export type ScanStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type DetectionSource = 'static' | 'ai' | 'correlated';

export type Category =
  | 'sql_injection'
  | 'command_injection'
  | 'hardcoded_secret'
  | 'path_traversal'
  | 'weak_crypto'
  | 'insecure_logging'
  | 'ssrf'
  | 'missing_auth'
  | 'unsafe_cors'
  | 'insecure_deserialization';

export interface Rule {
  rule_id: string;
  name: string;
  category: Category;
  severity: Severity;
  description: string;
  remediation: string;
}

export interface RawFinding {
  rule_id: string;
  category: Category;
  severity: Severity;
  confidence: Confidence;
  file: string;
  line: number;
  endLine: number;
  evidence: string;
  message: string;
  source: 'static' | 'ai';
}

export interface Evidence {
  label: string;
  detail: string;
}

export interface AIAssessment {
  is_valid: boolean;
  severity: Severity;
  confidence: Confidence;
  attack_path: string[];
  reasoning: string;
  evidence: Evidence[];
  false_positive_reason: string | null;
  remediation: string;
  suggested_patch: string | null;
  available: boolean;
}

export interface Finding extends RawFinding {
  id: string;
  scan_id: string;
  title: string;
  description: string;
  remediation: string;
  ai_explanation: AIAssessment | null;
  suggested_patch: string | null;
  status: FindingStatus;
  sources: DetectionSource[];
  risk_score: number;
  created_at: string;
}

export interface ScanFile {
  path: string;
  language: string;
  lines: number;
  content: string;
}

export interface ScanEvent {
  id: string;
  scan_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

export type ScanStage =
  | 'queued'
  | 'ingestion'
  | 'file_discovery'
  | 'static_analysis'
  | 'secret_detection'
  | 'ai_analysis'
  | 'correlation'
  | 'risk_scoring'
  | 'report'
  | 'completed';

export interface Scan {
  id: string;
  project_id: string;
  status: ScanStatus;
  commit_sha: string;
  branch: string;
  started_at: string;
  completed_at: string | null;
  files_scanned: number;
  lines_scanned: number;
  findings_count: number;
  risk_score: number;
  stage: ScanStage;
  progress: number; // 0..100
  current_file: string | null;
}

export interface Project {
  id: string;
  workspace_id: string;
  name: string;
  description: string;
  repository_url: string;
  default_branch: string;
  language: string;
  created_at: string;
  repo_key: string; // references a sample repo
}

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

export interface AuditEntry {
  id: string;
  project_id: string | null;
  scan_id: string | null;
  action: string;
  detail: string;
  timestamp: string;
}
