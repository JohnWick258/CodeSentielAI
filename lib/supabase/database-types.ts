export interface Database {
  workspaces: {
    Row: {
      id: string;
      name: string;
      owner_id: string;
      created_at: string;
    };
    Insert: {
      id?: string;
      name?: string;
      owner_id?: string;
      created_at?: string;
    };
    Update: {
      name?: string;
    };
  };

  projects: {
    Row: {
      id: string;
      workspace_id: string;
      name: string;
      description: string;
      repository_url: string;
      default_branch: string;
      language: string;
      repo_key: string;
      created_at: string;
    };
    Insert: {
      id?: string;
      workspace_id: string;
      name: string;
      description?: string;
      repository_url?: string;
      default_branch?: string;
      language?: string;
      repo_key?: string;
      created_at?: string;
    };
    Update: {
      name?: string;
      description?: string;
      repository_url?: string;
      default_branch?: string;
      language?: string;
      repo_key?: string;
    };
  };

  scans: {
    Row: {
      id: string;
      project_id: string;
      status: string;
      commit_sha: string;
      branch: string;
      started_at: string;
      completed_at: string | null;
      files_scanned: number;
      lines_scanned: number;
      findings_count: number;
      risk_score: number;
      stage: string;
      progress: number;
      current_file: string | null;
    };
    Insert: {
      id?: string;
      project_id: string;
      status?: string;
      commit_sha?: string;
      branch?: string;
      started_at?: string;
      completed_at?: string | null;
      files_scanned?: number;
      lines_scanned?: number;
      findings_count?: number;
      risk_score?: number;
      stage?: string;
      progress?: number;
      current_file?: string | null;
    };
    Update: {
      status?: string;
      completed_at?: string | null;
      files_scanned?: number;
      lines_scanned?: number;
      findings_count?: number;
      risk_score?: number;
      stage?: string;
      progress?: number;
      current_file?: string | null;
    };
  };

  findings: {
    Row: {
      id: string;
      scan_id: string;
      rule_id: string;
      category: string;
      severity: string;
      confidence: number;
      file: string;
      line: number;
      end_line: number;
      evidence: string;
      message: string;
      source: string;
      title: string;
      description: string;
      remediation: string;
      ai_explanation: any;
      suggested_patch: string | null;
      status: string;
      risk_score: number;
      created_at: string;
    };
    Insert: {
      id?: string;
      scan_id: string;
      rule_id: string;
      category: string;
      severity?: string;
      confidence?: number;
      file: string;
      line: number;
      end_line?: number;
      evidence?: string;
      message?: string;
      source?: string;
      title?: string;
      description?: string;
      remediation?: string;
      ai_explanation?: any;
      suggested_patch?: string | null;
      status?: string;
      risk_score?: number;
      created_at?: string;
    };
    Update: {
      status?: string;
      ai_explanation?: any;
      suggested_patch?: string | null;
    };
  };

  scan_events: {
    Row: {
      id: string;
      scan_id: string;
      event_type: string;
      payload: any;
      timestamp: string;
    };
    Insert: {
      id?: string;
      scan_id: string;
      event_type: string;
      payload?: any;
      timestamp?: string;
    };
    Update: {};
  };

  audit_log: {
    Row: {
      id: string;
      workspace_id: string | null;
      project_id: string | null;
      scan_id: string | null;
      action: string;
      detail: string;
      timestamp: string;
    };
    Insert: {
      id?: string;
      workspace_id?: string | null;
      project_id?: string | null;
      scan_id?: string | null;
      action: string;
      detail?: string;
      timestamp?: string;
    };
    Update: {};
  };

  notifications: {
    Row: {
      id: string;
      workspace_id: string;
      type: string;
      title: string;
      message: string;
      read: boolean;
      created_at: string;
    };
    Insert: {
      id?: string;
      workspace_id: string;
      type?: string;
      title: string;
      message?: string;
      read?: boolean;
      created_at?: string;
    };
    Update: {
      read?: boolean;
    };
  };

  user_settings: {
    Row: {
      id: string;
      user_id: string;
      theme: string;
      email_notifications: boolean;
      slack_webhook_url: string;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      user_id?: string;
      theme?: string;
      email_notifications?: boolean;
      slack_webhook_url?: string;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      theme?: string;
      email_notifications?: boolean;
      slack_webhook_url?: string;
      updated_at?: string;
    };
  };
}
