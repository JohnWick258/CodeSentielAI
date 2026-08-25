/*
# CodeSentinel AI — Full Stack Schema

## Overview
Converts the app from a client-side localStorage demo into a full-stack
multi-user application backed by Supabase. Users sign up with email/password,
own their workspaces, create projects, run scans, review findings, and
track everything via an audit log.

## New Tables

1. **workspaces** — Each user gets a personal workspace on signup.
   - id (uuid PK), name, owner_id (FK auth.users), created_at

2. **projects** — Security projects within a workspace.
   - id (uuid PK), workspace_id (FK workspaces), name, description,
     repository_url, default_branch, language, repo_key, created_at

3. **scans** — Scan runs against a project.
   - id (uuid PK), project_id (FK projects), status, commit_sha, branch,
     started_at, completed_at, files_scanned, lines_scanned,
     findings_count, risk_score, stage, progress, current_file

4. **findings** — Individual security findings from a scan.
   - id (uuid PK), scan_id (FK scans), rule_id, category, severity,
     confidence, file, line, end_line, evidence, message, source,
     title, description, remediation, ai_explanation (jsonb),
     suggested_patch, status, risk_score, created_at

5. **scan_events** — Per-stage events during a scan for progress tracking.
   - id (uuid PK), scan_id (FK scans), event_type, payload (jsonb), timestamp

6. **audit_log** — Full audit trail of all user actions.
   - id (uuid PK), workspace_id, project_id, scan_id, action, detail, timestamp

7. **notifications** — User notifications for scan completion, critical findings.
   - id (uuid PK), workspace_id, type, title, message, read, created_at

8. **user_settings** — Per-user preferences and API keys.
   - id (uuid PK), user_id (FK auth.users), theme, email_notifications,
     slack_webhook_url, created_at, updated_at

## Security
- RLS enabled on ALL tables.
- Owner-scoped via workspace ownership chain.
- Each user can only access data within their own workspace.
- user_id columns default to auth.uid() for seamless inserts.
*/

-- ===== WORKSPACES =====
CREATE TABLE IF NOT EXISTS workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'My Workspace',
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_workspaces" ON workspaces;
CREATE POLICY "select_own_workspaces" ON workspaces FOR SELECT
  TO authenticated USING (auth.uid() = owner_id);
DROP POLICY IF EXISTS "insert_own_workspaces" ON workspaces;
CREATE POLICY "insert_own_workspaces" ON workspaces FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "update_own_workspaces" ON workspaces;
CREATE POLICY "update_own_workspaces" ON workspaces FOR UPDATE
  TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "delete_own_workspaces" ON workspaces;
CREATE POLICY "delete_own_workspaces" ON workspaces FOR DELETE
  TO authenticated USING (auth.uid() = owner_id);

-- ===== PROJECTS =====
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  repository_url text NOT NULL DEFAULT '',
  default_branch text NOT NULL DEFAULT 'main',
  language text NOT NULL DEFAULT 'python',
  repo_key text NOT NULL DEFAULT 'vuln-demo',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_projects" ON projects;
CREATE POLICY "select_own_projects" ON projects FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM workspaces WHERE workspaces.id = projects.workspace_id AND workspaces.owner_id = auth.uid())
  );
DROP POLICY IF EXISTS "insert_own_projects" ON projects;
CREATE POLICY "insert_own_projects" ON projects FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM workspaces WHERE workspaces.id = projects.workspace_id AND workspaces.owner_id = auth.uid())
  );
DROP POLICY IF EXISTS "update_own_projects" ON projects;
CREATE POLICY "update_own_projects" ON projects FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM workspaces WHERE workspaces.id = projects.workspace_id AND workspaces.owner_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM workspaces WHERE workspaces.id = projects.workspace_id AND workspaces.owner_id = auth.uid())
  );
DROP POLICY IF EXISTS "delete_own_projects" ON projects;
CREATE POLICY "delete_own_projects" ON projects FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM workspaces WHERE workspaces.id = projects.workspace_id AND workspaces.owner_id = auth.uid())
  );

-- ===== SCANS =====
CREATE TABLE IF NOT EXISTS scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'QUEUED',
  commit_sha text NOT NULL DEFAULT '',
  branch text NOT NULL DEFAULT 'main',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  files_scanned integer NOT NULL DEFAULT 0,
  lines_scanned integer NOT NULL DEFAULT 0,
  findings_count integer NOT NULL DEFAULT 0,
  risk_score integer NOT NULL DEFAULT 0,
  stage text NOT NULL DEFAULT 'queued',
  progress integer NOT NULL DEFAULT 0,
  current_file text
);
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_scans" ON scans;
CREATE POLICY "select_own_scans" ON scans FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspaces w ON w.id = p.workspace_id
      WHERE p.id = scans.project_id AND w.owner_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "insert_own_scans" ON scans;
CREATE POLICY "insert_own_scans" ON scans FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspaces w ON w.id = p.workspace_id
      WHERE p.id = scans.project_id AND w.owner_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "update_own_scans" ON scans;
CREATE POLICY "update_own_scans" ON scans FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspaces w ON w.id = p.workspace_id
      WHERE p.id = scans.project_id AND w.owner_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspaces w ON w.id = p.workspace_id
      WHERE p.id = scans.project_id AND w.owner_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "delete_own_scans" ON scans;
CREATE POLICY "delete_own_scans" ON scans FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspaces w ON w.id = p.workspace_id
      WHERE p.id = scans.project_id AND w.owner_id = auth.uid()
    )
  );

-- ===== FINDINGS =====
CREATE TABLE IF NOT EXISTS findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id uuid NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  rule_id text NOT NULL,
  category text NOT NULL,
  severity text NOT NULL DEFAULT 'INFO',
  confidence double precision NOT NULL DEFAULT 0.5,
  file text NOT NULL,
  line integer NOT NULL,
  end_line integer NOT NULL DEFAULT 0,
  evidence text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT 'static',
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  remediation text NOT NULL DEFAULT '',
  ai_explanation jsonb,
  suggested_patch text,
  status text NOT NULL DEFAULT 'OPEN',
  risk_score integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE findings ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_findings_scan_id ON findings(scan_id);
CREATE INDEX IF NOT EXISTS idx_findings_severity ON findings(severity);
CREATE INDEX IF NOT EXISTS idx_findings_status ON findings(status);

DROP POLICY IF EXISTS "select_own_findings" ON findings;
CREATE POLICY "select_own_findings" ON findings FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM scans s
      JOIN projects p ON p.id = s.project_id
      JOIN workspaces w ON w.id = p.workspace_id
      WHERE s.id = findings.scan_id AND w.owner_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "insert_own_findings" ON findings;
CREATE POLICY "insert_own_findings" ON findings FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM scans s
      JOIN projects p ON p.id = s.project_id
      JOIN workspaces w ON w.id = p.workspace_id
      WHERE s.id = findings.scan_id AND w.owner_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "update_own_findings" ON findings;
CREATE POLICY "update_own_findings" ON findings FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM scans s
      JOIN projects p ON p.id = s.project_id
      JOIN workspaces w ON w.id = p.workspace_id
      WHERE s.id = findings.scan_id AND w.owner_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM scans s
      JOIN projects p ON p.id = s.project_id
      JOIN workspaces w ON w.id = p.workspace_id
      WHERE s.id = findings.scan_id AND w.owner_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "delete_own_findings" ON findings;
CREATE POLICY "delete_own_findings" ON findings FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM scans s
      JOIN projects p ON p.id = s.project_id
      JOIN workspaces w ON w.id = p.workspace_id
      WHERE s.id = findings.scan_id AND w.owner_id = auth.uid()
    )
  );

-- ===== SCAN_EVENTS =====
CREATE TABLE IF NOT EXISTS scan_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id uuid NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  timestamp timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE scan_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_scan_events_scan_id ON scan_events(scan_id);

DROP POLICY IF EXISTS "select_own_scan_events" ON scan_events;
CREATE POLICY "select_own_scan_events" ON scan_events FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM scans s
      JOIN projects p ON p.id = s.project_id
      JOIN workspaces w ON w.id = p.workspace_id
      WHERE s.id = scan_events.scan_id AND w.owner_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "insert_own_scan_events" ON scan_events;
CREATE POLICY "insert_own_scan_events" ON scan_events FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM scans s
      JOIN projects p ON p.id = s.project_id
      JOIN workspaces w ON w.id = p.workspace_id
      WHERE s.id = scan_events.scan_id AND w.owner_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "delete_own_scan_events" ON scan_events;
CREATE POLICY "delete_own_scan_events" ON scan_events FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM scans s
      JOIN projects p ON p.id = s.project_id
      JOIN workspaces w ON w.id = p.workspace_id
      WHERE s.id = scan_events.scan_id AND w.owner_id = auth.uid()
    )
  );

-- ===== AUDIT_LOG =====
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  scan_id uuid REFERENCES scans(id) ON DELETE CASCADE,
  action text NOT NULL,
  detail text NOT NULL DEFAULT '',
  timestamp timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_audit_log_workspace ON audit_log(workspace_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp DESC);

DROP POLICY IF EXISTS "select_own_audit" ON audit_log;
CREATE POLICY "select_own_audit" ON audit_log FOR SELECT
  TO authenticated USING (
    workspace_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM workspaces WHERE workspaces.id = audit_log.workspace_id AND workspaces.owner_id = auth.uid())
  );
DROP POLICY IF EXISTS "insert_own_audit" ON audit_log;
CREATE POLICY "insert_own_audit" ON audit_log FOR INSERT
  TO authenticated WITH CHECK (
    workspace_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM workspaces WHERE workspaces.id = audit_log.workspace_id AND workspaces.owner_id = auth.uid())
  );

-- ===== NOTIFICATIONS =====
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  message text NOT NULL DEFAULT '',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_notifications_workspace ON notifications(workspace_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(workspace_id, read);

DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM workspaces WHERE workspaces.id = notifications.workspace_id AND workspaces.owner_id = auth.uid())
  );
DROP POLICY IF EXISTS "insert_own_notifications" ON notifications;
CREATE POLICY "insert_own_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM workspaces WHERE workspaces.id = notifications.workspace_id AND workspaces.owner_id = auth.uid())
  );
DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM workspaces WHERE workspaces.id = notifications.workspace_id AND workspaces.owner_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM workspaces WHERE workspaces.id = notifications.workspace_id AND workspaces.owner_id = auth.uid())
  );
DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM workspaces WHERE workspaces.id = notifications.workspace_id AND workspaces.owner_id = auth.uid())
  );

-- ===== USER_SETTINGS =====
CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  theme text NOT NULL DEFAULT 'dark',
  email_notifications boolean NOT NULL DEFAULT true,
  slack_webhook_url text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_settings" ON user_settings;
CREATE POLICY "select_own_settings" ON user_settings FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_settings" ON user_settings;
CREATE POLICY "insert_own_settings" ON user_settings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_settings" ON user_settings;
CREATE POLICY "update_own_settings" ON user_settings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_settings" ON user_settings;
CREATE POLICY "delete_own_settings" ON user_settings FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
