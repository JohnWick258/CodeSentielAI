import type { RawFinding, ScanFile } from './types';

export interface Analyzer {
  id: string;
  analyze(file: ScanFile): RawFinding[];
}

function clampLine(n: number, max: number): number {
  return Math.max(1, Math.min(n, max));
}

function snippet(lines: string[], start: number, end: number): string {
  return lines
    .slice(start - 1, end)
    .map((l, i) => `${start + i}│ ${l}`)
    .join('\n');
}

// ---------- SQL Injection ----------
const SQL_EXEC = /\.(execute|executemany|executescript)\s*\(/;
const SQL_KEYWORDS = /\b(select|insert|update|delete|from|where|values|into|table)\b/i;

const SQLInjectionAnalyzer: Analyzer = {
  id: 'sql_injection',
  analyze(file) {
    const out: RawFinding[] = [];
    const lines = file.content.split('\n');
    lines.forEach((line, idx) => {
      const lineNo = idx + 1;
      const trimmed = line.trim();
      if (!SQL_EXEC.test(line) && !/\bquery\s*=/.test(line)) return;
      if (!SQL_KEYWORDS.test(line)) return;

      // string concatenation: "SELECT ..." + var
      if (/["'].*select.*["']\s*\+/.test(line) || /\+\s*\w+/.test(line) && /["'].*select/i.test(line)) {
        out.push({
          rule_id: 'PY-SQL-001',
          category: 'sql_injection',
          severity: 'HIGH',
          confidence: 0.94,
          file: file.path,
          line: lineNo,
          endLine: clampLine(lineNo, lines.length),
          evidence: snippet(lines, lineNo, clampLine(lineNo, lines.length)),
          message: 'User-controlled input concatenated into SQL query string.',
          source: 'static',
        });
        return;
      }
      // f-string SQL: f"SELECT ... {var}"
      if (/f["'].*\{.*\}.*["']/.test(line) && SQL_KEYWORDS.test(line)) {
        out.push({
          rule_id: 'PY-SQL-002',
          category: 'sql_injection',
          severity: 'HIGH',
          confidence: 0.9,
          file: file.path,
          line: lineNo,
          endLine: clampLine(lineNo, lines.length),
          evidence: snippet(lines, lineNo, clampLine(lineNo, lines.length)),
          message: 'SQL query built with f-string interpolation of a variable.',
          source: 'static',
        });
      }
      // .format() SQL
      if (/\.format\s*\(/.test(line) && SQL_KEYWORDS.test(line)) {
        out.push({
          rule_id: 'PY-SQL-001',
          category: 'sql_injection',
          severity: 'HIGH',
          confidence: 0.88,
          file: file.path,
          line: lineNo,
          endLine: clampLine(lineNo, lines.length),
          evidence: snippet(lines, lineNo, clampLine(lineNo, lines.length)),
          message: 'SQL query built with .format() — values are interpolated, not parameterized.',
          source: 'static',
        });
      }
    });
    return out;
  },
};

// ---------- Command Injection ----------
const CommandInjectionAnalyzer: Analyzer = {
  id: 'command_injection',
  analyze(file) {
    const out: RawFinding[] = [];
    const lines = file.content.split('\n');
    lines.forEach((line, idx) => {
      const lineNo = idx + 1;
      const trimmed = line.trim();

      if (/os\.system\s*\(/.test(line)) {
        out.push({
          rule_id: 'PY-CMD-001',
          category: 'command_injection',
          severity: 'CRITICAL',
          confidence: 0.92,
          file: file.path,
          line: lineNo,
          endLine: clampLine(lineNo, lines.length),
          evidence: snippet(lines, lineNo, clampLine(lineNo, lines.length)),
          message: 'os.system() executes a shell command — vulnerable to command injection.',
          source: 'static',
        });
        return;
      }
      if (/subprocess\.(run|call|Popen|check_output|check_call)\s*\(/.test(line) && /shell\s*=\s*True/.test(line)) {
        out.push({
          rule_id: 'PY-CMD-002',
          category: 'command_injection',
          severity: 'CRITICAL',
          confidence: 0.9,
          file: file.path,
          line: lineNo,
          endLine: clampLine(lineNo, lines.length),
          evidence: snippet(lines, lineNo, clampLine(lineNo, lines.length)),
          message: 'subprocess called with shell=True and a string command — shell metacharacters are interpreted.',
          source: 'static',
        });
      }
    });
    return out;
  },
};

// ---------- Hardcoded Secrets ----------
const SECRET_PATTERNS: { pattern: RegExp; rule: string; conf: number; msg: string }[] = [
  { pattern: /(?:sk|pk|rk)_(?:live|test)_[A-Za-z0-9]{20,}/, rule: 'SEC-SECRET-001', conf: 0.97, msg: 'Stripe-style API key literal detected.' },
  { pattern: /ghp_[A-Za-z0-9]{30,}/, rule: 'SEC-SECRET-001', conf: 0.97, msg: 'GitHub personal access token literal detected.' },
  { pattern: /AKIA[0-9A-Z]{16}/, rule: 'SEC-SECRET-001', conf: 0.96, msg: 'AWS access key ID literal detected.' },
  { pattern: /(?:api[_-]?key|apikey|secret|token)\s*=\s*["'][A-Za-z0-9_\-]{16,}["']/i, rule: 'SEC-SECRET-001', conf: 0.82, msg: 'High-entropy secret assigned to a credential-named variable.' },
  { pattern: /(?:password|passwd|pwd)\s*=\s*["'][^"']{4,}["']/i, rule: 'SEC-SECRET-002', conf: 0.78, msg: 'Password literal assigned to a credential variable.' },
  { pattern: /-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/, rule: 'SEC-SECRET-001', conf: 0.99, msg: 'Embedded private key material detected.' },
];

const ENTROPY_THRESHOLD = 3.8;
function shannonEntropy(s: string): number {
  const freq: Record<string, number> = {};
  for (const ch of s) freq[ch] = (freq[ch] || 0) + 1;
  let h = 0;
  const len = s.length;
  for (const k in freq) {
    const p = freq[k] / len;
    h -= p * Math.log2(p);
  }
  return h;
}

const SecretAnalyzer: Analyzer = {
  id: 'hardcoded_secret',
  analyze(file) {
    const out: RawFinding[] = [];
    const lines = file.content.split('\n');
    lines.forEach((line, idx) => {
      const lineNo = idx + 1;
      if (/^\s*#/.test(line)) return; // skip comments
      for (const p of SECRET_PATTERNS) {
        if (p.pattern.test(line)) {
          out.push({
            rule_id: p.rule,
            category: 'hardcoded_secret',
            severity: p.rule === 'SEC-SECRET-001' ? 'CRITICAL' : 'HIGH',
            confidence: p.conf,
            file: file.path,
            line: lineNo,
            endLine: clampLine(lineNo, lines.length),
            evidence: snippet(lines, lineNo, clampLine(lineNo, lines.length)),
            message: p.msg,
            source: 'static',
          });
          return;
        }
      }
      // entropy-based: long base64-ish string literal
      const m = line.match(/["']([A-Za-z0-9+/=_\-]{32,})["']/);
      if (m && shannonEntropy(m[1]) > ENTROPY_THRESHOLD) {
        out.push({
          rule_id: 'SEC-SECRET-001',
          category: 'hardcoded_secret',
          severity: 'CRITICAL',
          confidence: 0.74,
          file: file.path,
          line: lineNo,
          endLine: clampLine(lineNo, lines.length),
          evidence: snippet(lines, lineNo, clampLine(lineNo, lines.length)),
          message: 'High-entropy string literal — possible hardcoded secret.',
          source: 'static',
        });
      }
    });
    return out;
  },
};

// ---------- Weak Crypto ----------
const WeakCryptoAnalyzer: Analyzer = {
  id: 'weak_crypto',
  analyze(file) {
    const out: RawFinding[] = [];
    const lines = file.content.split('\n');
    lines.forEach((line, idx) => {
      const lineNo = idx + 1;
      if (/hashlib\.(md5|sha1)\s*\(/.test(line)) {
        out.push({
          rule_id: 'PY-CRYPTO-001',
          category: 'weak_crypto',
          severity: 'MEDIUM',
          confidence: 0.9,
          file: file.path,
          line: lineNo,
          endLine: clampLine(lineNo, lines.length),
          evidence: snippet(lines, lineNo, clampLine(lineNo, lines.length)),
          message: 'Broken hash function used — vulnerable to collision attacks.',
          source: 'static',
        });
      }
      if (/\brandom\.random\b/.test(line) || /\brandom\.randint\b/.test(line) || /\brandom\.choice\b/.test(line)) {
        if (/(token|secret|password|key|session|nonce|salt|otp)/i.test(line)) {
          out.push({
            rule_id: 'PY-CRYPTO-002',
            category: 'weak_crypto',
            severity: 'MEDIUM',
            confidence: 0.82,
            file: file.path,
            line: lineNo,
            endLine: clampLine(lineNo, lines.length),
            evidence: snippet(lines, lineNo, clampLine(lineNo, lines.length)),
            message: 'Insecure random module used in a security-sensitive context.',
            source: 'static',
          });
        }
      }
    });
    return out;
  },
};

// ---------- Path Traversal ----------
const PathTraversalAnalyzer: Analyzer = {
  id: 'path_traversal',
  analyze(file) {
    const out: RawFinding[] = [];
    const lines = file.content.split('\n');
    lines.forEach((line, idx) => {
      const lineNo = idx + 1;
      const openFs = /\.(open|read_file|read_text|write|read_bytes)\s*\(/.test(line) || /\bopen\s*\(/.test(line);
      if (!openFs) return;
      const userVar = /\b(request\.|req\.|input\(|args\.|sys\.argv|\.get\()/.test(line);
      const join = /os\.path\.join|pathlib\.Path\(/.test(line);
      if (userVar || (join && /\.\.|\bfname\b|\bfilename\b|\bpath\b/.test(line) && /\brequest\b|\breq\b|\binput\b/.test(file.content.slice(Math.max(0, idx * 80 - 400), idx * 80 + 400)))) {
        out.push({
          rule_id: 'PY-PATH-001',
          category: 'path_traversal',
          severity: 'HIGH',
          confidence: 0.8,
          file: file.path,
          line: lineNo,
          endLine: clampLine(lineNo, lines.length),
          evidence: snippet(lines, lineNo, clampLine(lineNo, lines.length)),
          message: 'Filesystem path constructed from user-controlled input without boundary check.',
          source: 'static',
        });
      }
    });
    return out;
  },
};

// ---------- Insecure Logging ----------
const LoggingAnalyzer: Analyzer = {
  id: 'insecure_logging',
  analyze(file) {
    const out: RawFinding[] = [];
    const lines = file.content.split('\n');
    lines.forEach((line, idx) => {
      const lineNo = idx + 1;
      if (/(?:logging|logger|log)\.(?:info|debug|warning|error|critical)\s*\(/.test(line)) {
        if (/\b(password|passwd|pwd|token|secret|api[_-]?key|authorization|auth_header|cookie)\b/i.test(line)) {
          out.push({
            rule_id: 'PY-LOG-001',
            category: 'insecure_logging',
            severity: 'MEDIUM',
            confidence: 0.85,
            file: file.path,
            line: lineNo,
            endLine: clampLine(lineNo, lines.length),
            evidence: snippet(lines, lineNo, clampLine(lineNo, lines.length)),
            message: 'Credential-like variable passed to a logging call.',
            source: 'static',
          });
        }
      }
    });
    return out;
  },
};

// ---------- SSRF ----------
const SSRFAnalyzer: Analyzer = {
  id: 'ssrf',
  analyze(file) {
    const out: RawFinding[] = [];
    const lines = file.content.split('\n');
    lines.forEach((line, idx) => {
      const lineNo = idx + 1;
      const fetcher = /(requests\.(get|post|put|delete|head|patch|request)|urllib\.request\.urlopen|httpx\.(get|post|Client))\s*\(/;
      if (!fetcher.test(line)) return;
      if (/\b(request\.|req\.|args\.|input\(|\.get\()/.test(line) || /f["']https?:\/\//.test(line)) {
        out.push({
          rule_id: 'PY-SSRF-001',
          category: 'ssrf',
          severity: 'HIGH',
          confidence: 0.78,
          file: file.path,
          line: lineNo,
          endLine: clampLine(lineNo, lines.length),
          evidence: snippet(lines, lineNo, clampLine(lineNo, lines.length)),
          message: 'HTTP request made to a URL derived from user input without an allowlist.',
          source: 'static',
        });
      }
    });
    return out;
  },
};

// ---------- Unsafe CORS ----------
const CORSAnalyzer: Analyzer = {
  id: 'unsafe_cors',
  analyze(file) {
    const out: RawFinding[] = [];
    const lines = file.content.split('\n');
    lines.forEach((line, idx) => {
      const lineNo = idx + 1;
      if (/Access-Control-Allow-Origin/i.test(line) && /["']\*["']/.test(line)) {
        out.push({
          rule_id: 'WEB-CORS-001',
          category: 'unsafe_cors',
          severity: 'MEDIUM',
          confidence: 0.86,
          file: file.path,
          line: lineNo,
          endLine: clampLine(lineNo, lines.length),
          evidence: snippet(lines, lineNo, clampLine(lineNo, lines.length)),
          message: 'Access-Control-Allow-Origin set to wildcard.',
          source: 'static',
        });
      }
    });
    return out;
  },
};

// ---------- Missing Auth ----------
const MissingAuthAnalyzer: Analyzer = {
  id: 'missing_auth',
  analyze(file) {
    const out: RawFinding[] = [];
    const lines = file.content.split('\n');
    let inDecorator = false;
    let decoratorLine = -1;
    lines.forEach((line, idx) => {
      const lineNo = idx + 1;
      const trimmed = line.trim();
      if (trimmed.startsWith('@') && /\.(route|get|post|put|delete|patch|api_route)\(/.test(trimmed)) {
        inDecorator = true;
        decoratorLine = lineNo;
        return;
      }
      if (inDecorator && /\bdef\s+/.test(trimmed)) {
        // check if the function body (next few lines) references auth
        const body = lines.slice(idx, Math.min(idx + 12, lines.length)).join('\n');
        if (!/(require_auth|@login_required|get_current_user|authenticate|verify_token|current_user|auth\.)/i.test(body)) {
          const sensitive = /(delete|admin|update|create|payment|checkout|transfer|secret|user|account|password|settings)/i.test(
            lines[decoratorLine - 1] + trimmed
          );
          if (sensitive) {
            out.push({
              rule_id: 'WEB-AUTH-001',
              category: 'missing_auth',
              severity: 'HIGH',
              confidence: 0.62,
              file: file.path,
              line: decoratorLine,
              endLine: clampLine(lineNo, lines.length),
              evidence: snippet(lines, decoratorLine, clampLine(lineNo, lines.length)),
              message: 'Sensitive route handler lacks an authentication check.',
              source: 'static',
            });
          }
        }
        inDecorator = false;
      }
    });
    return out;
  },
};

// ---------- Insecure Deserialization ----------
const DeserializationAnalyzer: Analyzer = {
  id: 'insecure_deserialization',
  analyze(file) {
    const out: RawFinding[] = [];
    const lines = file.content.split('\n');
    lines.forEach((line, idx) => {
      const lineNo = idx + 1;
      if (/pickle\.(loads|load)\s*\(/.test(line) || /yaml\.(load|unsafe_load)\s*\(/.test(line)) {
        out.push({
          rule_id: 'PY-DESERIAL-001',
          category: 'insecure_deserialization',
          severity: 'CRITICAL',
          confidence: 0.93,
          file: file.path,
          line: lineNo,
          endLine: clampLine(lineNo, lines.length),
          evidence: snippet(lines, lineNo, clampLine(lineNo, lines.length)),
          message: 'Unsafe deserialization of potentially attacker-controlled data.',
          source: 'static',
        });
      }
    });
    return out;
  },
};

export const ANALYZERS: Analyzer[] = [
  SQLInjectionAnalyzer,
  CommandInjectionAnalyzer,
  SecretAnalyzer,
  WeakCryptoAnalyzer,
  PathTraversalAnalyzer,
  LoggingAnalyzer,
  SSRFAnalyzer,
  CORSAnalyzer,
  MissingAuthAnalyzer,
  DeserializationAnalyzer,
];

export function runAnalyzers(file: ScanFile): RawFinding[] {
  const all: RawFinding[] = [];
  for (const a of ANALYZERS) all.push(...a.analyze(file));
  // dedupe by rule+file+line
  const seen = new Set<string>();
  return all.filter((f) => {
    const k = `${f.rule_id}:${f.file}:${f.line}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
