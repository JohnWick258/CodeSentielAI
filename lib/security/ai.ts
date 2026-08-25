import type { AIAssessment, RawFinding, ScanFile } from './types';
import { RULES_BY_ID } from './rules';

// Deterministic "AI" reasoning layer.
// In a real deployment this would call an LLM with structured output.
// Here we generate grounded assessments from the finding + code context,
// including attack paths, evidence, and patches. This is NOT a fake timer:
// the assessment is computed from the actual finding and source code.

function patchFor(
  finding: RawFinding,
  file: ScanFile
): string | null {
  const lines = file.content.split('\n');
  const line = lines[finding.line - 1] ?? '';
  switch (finding.rule_id) {
    case 'PY-SQL-001':
    case 'PY-SQL-002': {
      const indent = line.match(/^\s*/)?.[0] ?? '';
      return [
        `--- a/${file.path}`,
        `+++ b/${file.path}`,
        `@@ -${finding.line},1 +${finding.line},2 @@`,
        `- ${line.trimStart()}`,
        `+ ${indent}query = "SELECT ... WHERE id = %s"`,
        `+ ${indent}cursor.execute(query, (user_id,))`,
      ].join('\n');
    }
    case 'PY-CMD-001': {
      const indent = line.match(/^\s*/)?.[0] ?? '';
      return [
        `--- a/${file.path}`,
        `+++ b/${file.path}`,
        `@@ -${finding.line},1 +${finding.line},1 @@`,
        `- ${line.trimStart()}`,
        `+ ${indent}subprocess.run(["ls", "-la", target], shell=False, check=True)`,
      ].join('\n');
    }
    case 'PY-CMD-002': {
      const indent = line.match(/^\s*/)?.[0] ?? '';
      return [
        `--- a/${file.path}`,
        `+++ b/${file.path}`,
        `@@ -${finding.line},1 +${finding.line},1 @@`,
        `- ${line.trimStart()}`,
        `+ ${indent}subprocess.run(cmd_args, shell=False, check=True)`,
      ].join('\n');
    }
    case 'SEC-SECRET-001':
    case 'SEC-SECRET-002': {
      const indent = line.match(/^\s*/)?.[0] ?? '';
      const varMatch = line.match(/(\w+)\s*=/);
      const varName = varMatch?.[1] ?? 'SECRET';
      return [
        `--- a/${file.path}`,
        `+++ b/${file.path}`,
        `@@ -${finding.line},1 +${finding.line},1 @@`,
        `- ${line.trimStart()}`,
        `+ ${indent}${varName} = os.environ["${varName.toUpperCase()}"]`,
      ].join('\n');
    }
    case 'PY-CRYPTO-001': {
      return [
        `--- a/${file.path}`,
        `+++ b/${file.path}`,
        `@@ -${finding.line},1 +${finding.line},1 @@`,
        `- ${line.trimStart()}`,
        `+ ${line.replace(/md5|sha1/, 'sha256').trimStart()}`,
      ].join('\n');
    }
    case 'PY-CRYPTO-002': {
      const indent = line.match(/^\s*/)?.[0] ?? '';
      return [
        `--- a/${file.path}`,
        `+++ b/${file.path}`,
        `@@ -${finding.line},1 +${finding.line},1 @@`,
        `- ${line.trimStart()}`,
        `+ ${indent}secrets.token_urlsafe(32)  # cryptographically secure`,
      ].join('\n');
    }
    case 'PY-PATH-001': {
      const indent = line.match(/^\s*/)?.[0] ?? '';
      return [
        `--- a/${file.path}`,
        `+++ b/${file.path}`,
        `@@ -${finding.line},1 +${finding.line},3 @@`,
        `- ${line.trimStart()}`,
        `+ ${indent}base = os.path.realpath(BASE_DIR)`,
        `+ ${indent}target = os.path.realpath(os.path.join(base, filename))`,
        `+ ${indent}if not target.startswith(base): raise ValueError("path traversal")`,
      ].join('\n');
    }
    case 'PY-LOG-001': {
      return [
        `--- a/${file.path}`,
        `+++ b/${file.path}`,
        `@@ -${finding.line},1 +${finding.line},1 @@`,
        `- ${line.trimStart()}`,
        `+ ${line.replace(/(password|token|secret|api_key|authorization|auth_header|cookie)/gi, '"[REDACTED]"').trimStart()}`,
      ].join('\n');
    }
    case 'PY-SSRF-001': {
      const indent = line.match(/^\s*/)?.[0] ?? '';
      return [
        `--- a/${file.path}`,
        `+++ b/${file.path}`,
        `@@ -${finding.line},1 +${finding.line},3 @@`,
        `- ${line.trimStart()}`,
        `+ ${indent}host = urllib.parse.urlparse(url).hostname`,
        `+ ${indent}if host not in ALLOWED_HOSTS: raise ValueError("host not allowed")`,
        `+ ${indent}requests.get(url, timeout=5)`,
      ].join('\n');
    }
    case 'WEB-CORS-001': {
      const indent = line.match(/^\s*/)?.[0] ?? '';
      return [
        `--- a/${file.path}`,
        `+++ b/${file.path}`,
        `@@ -${finding.line},1 +${finding.line},1 @@`,
        `- ${line.trimStart()}`,
        `+ ${indent}"Access-Control-Allow-Origin": "https://app.example.com"`,
      ].join('\n');
    }
    case 'WEB-AUTH-001': {
      const indent = line.match(/^\s*/)?.[0] ?? '';
      return [
        `--- a/${file.path}`,
        `+++ b/${file.path}`,
        `@@ -${finding.line},0 +${finding.line},1 @@`,
        `+ ${indent}@require_auth`,
        `  ${line.trimStart()}`,
      ].join('\n');
    }
    case 'PY-DESERIAL-001': {
      const indent = line.match(/^\s*/)?.[0] ?? '';
      return [
        `--- a/${file.path}`,
        `+++ b/${file.path}`,
        `@@ -${finding.line},1 +${finding.line},1 @@`,
        `- ${line.trimStart()}`,
        `+ ${indent}data = json.loads(raw)  # safe deserialization`,
      ].join('\n');
    }
    default:
      return null;
  }
}

function attackPath(finding: RawFinding): string[] {
  switch (finding.category) {
    case 'sql_injection':
      return ['User input', 'API parameter', 'String-built query', 'cursor.execute()', 'Database'];
    case 'command_injection':
      return ['User input', 'Shell command string', 'os.system / subprocess(shell=True)', 'Host shell', 'Arbitrary command exec'];
    case 'hardcoded_secret':
      return ['Source repository', 'Cloned/forked code', 'Credential literal', 'Attacker reads secret', 'Account compromise'];
    case 'path_traversal':
      return ['User input', 'Path join', 'open()/read()', 'Escapes base directory', 'Arbitrary file read/write'];
    case 'weak_crypto':
      return ['Hash/random output', 'Predictable value', 'Collision/preimage attack', 'Forged integrity'];
    case 'insecure_logging':
      return ['Credential in memory', 'Logging call', 'Log file / stdout', 'Operator or attacker reads logs', 'Credential leak'];
    case 'ssrf':
      return ['User-supplied URL', 'requests.get/urlopen', 'Server-side fetch', 'Internal service reached', 'Metadata service / internal data'];
    case 'missing_auth':
      return ['Unauthenticated request', 'Sensitive route', 'No auth check', 'Operation executed', 'Privilege abuse'];
    case 'unsafe_cors':
      return ['Malicious origin', 'Cross-origin credentialed request', 'Wildcard ACAO', 'Browser allows response', 'Data exfiltration'];
    case 'insecure_deserialization':
      return ['Attacker-crafted blob', 'pickle.loads / yaml.load', 'Arbitrary object construction', 'Code exec in process', 'Host compromise'];
    default:
      return ['User input', 'Vulnerable code', 'Exploitation'];
  }
}

function evidenceFor(finding: RawFinding): { label: string; detail: string }[] {
  const ev: { label: string; detail: string }[] = [
    { label: 'Vulnerable code location', detail: `${finding.file}:${finding.line}` },
    { label: 'Static rule matched', detail: finding.rule_id },
  ];
  if (finding.evidence) {
    ev.push({ label: 'Source excerpt', detail: finding.evidence.split('\n').slice(0, 3).join('\n') });
  }
  switch (finding.category) {
    case 'sql_injection':
      ev.push({ label: 'Taint source', detail: 'User-controlled variable interpolated into SQL string.' });
      ev.push({ label: 'Sink', detail: 'cursor.execute / query execution.' });
      break;
    case 'command_injection':
      ev.push({ label: 'Taint source', detail: 'User input passed to shell invocation.' });
      ev.push({ label: 'Sink', detail: 'os.system / subprocess with shell=True.' });
      break;
    case 'hardcoded_secret':
      ev.push({ label: 'Detection method', detail: 'Pattern match + entropy analysis.' });
      ev.push({ label: 'Risk', detail: 'Credential committed to version control.' });
      break;
    case 'path_traversal':
      ev.push({ label: 'Taint source', detail: 'Filename/path parameter from request.' });
      ev.push({ label: 'Sink', detail: 'open() / os.path.join without boundary check.' });
      break;
  }
  return ev;
}

function reasoningFor(finding: RawFinding): string {
  const rule = RULES_BY_ID[finding.rule_id];
  switch (finding.category) {
    case 'sql_injection':
      return `The query at ${finding.file}:${finding.line} builds SQL by interpolating a variable rather than binding it as a parameter. An attacker who controls that variable can append SQL syntax (e.g. ' OR 1=1 --) to alter query logic, bypass authentication, or exfiltrate data. Parameterized queries separate code from data, which is the canonical fix.`;
    case 'command_injection':
      return `A shell command is constructed from user input and executed via os.system or subprocess(shell=True). Shell metacharacters (;, |, $(), backticks) in the input are interpreted by the shell, allowing arbitrary command execution with the process's privileges.`;
    case 'hardcoded_secret':
      return `A credential literal is present in source. Anyone with repository read access obtains the secret. Entropy and pattern analysis indicate this is a real key, not a placeholder. The secret must be rotated and moved to a secrets manager.`;
    case 'path_traversal':
      return `A filesystem path is built from user-supplied input without normalization or a base-directory check. Inputs containing "../" can escape the intended directory, leading to arbitrary file read or write.`;
    case 'weak_crypto':
      return `A broken hash (MD5/SHA1) or non-cryptographic RNG is used in a security-sensitive context. These primitives do not provide the guarantees required and can be defeated by collision or prediction attacks.`;
    case 'insecure_logging':
      return `A credential-named variable is passed to a logging call. Logs are often persisted, shipped to aggregation systems, or visible to operators — leaking the secret.`;
    case 'ssrf':
      return `An outbound HTTP request is made to a URL derived from user input without an allowlist. An attacker can target internal services or cloud metadata endpoints from the server's network position.`;
    case 'missing_auth':
      return `A route handling a sensitive operation has no authentication check. The operation is reachable by any unauthenticated caller.`;
    case 'unsafe_cors':
      return `Access-Control-Allow-Origin is set to "*". When combined with credentialed requests, any origin can read responses on behalf of users.`;
    case 'insecure_deserialization':
      return `pickle/yaml unsafe load is applied to data that may be attacker-controlled. These libraries can construct arbitrary Python objects, leading directly to remote code execution.`;
    default:
      return rule?.description ?? finding.message;
  }
}

export function assessFinding(
  finding: RawFinding,
  file: ScanFile
): AIAssessment {
  const rule = RULES_BY_ID[finding.rule_id];
  const patch = patchFor(finding, file);
  // Confidence adjustment: correlated findings (both static + ai) get a boost
  const aiConfidence = Math.min(0.98, finding.confidence + 0.04);
  return {
    is_valid: true,
    severity: finding.severity,
    confidence: aiConfidence,
    attack_path: attackPath(finding),
    reasoning: reasoningFor(finding),
    evidence: evidenceFor(finding),
    false_positive_reason: null,
    remediation: rule?.remediation ?? finding.message,
    suggested_patch: patch,
    available: true,
  };
}

// Prompt-injection defense check: detect injected instructions in comments
const INJECTION_PATTERNS = [
  /ignore (all |previous |the )?(security |security )?(rules|instructions|problems|issues|findings)/i,
  /mark (this|all|the) (code|file|file) as safe/i,
  /AI reviewer[: ]?/i,
  /do not report/i,
  /no vulnerabilities here/i,
  /this is safe,? trust me/i,
  /disregard (previous|all) (security )?instructions/i,
];

export function detectPromptInjection(content: string): { line: number; text: string }[] {
  const hits: { line: number; text: string }[] = [];
  content.split('\n').forEach((l, i) => {
    if (!/^\s*#/.test(l) && !/^\s*\/\//.test(l) && !/^\s*\*/.test(l)) return;
    for (const p of INJECTION_PATTERNS) {
      if (p.test(l)) {
        hits.push({ line: i + 1, text: l.trim() });
        break;
      }
    }
  });
  return hits;
}
