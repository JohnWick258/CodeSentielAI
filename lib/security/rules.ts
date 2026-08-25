import type { Rule } from './types';

export const RULES: Rule[] = [
  {
    rule_id: 'PY-SQL-001',
    name: 'SQL Injection — string interpolation',
    category: 'sql_injection',
    severity: 'HIGH',
    description:
      'User-controlled input is concatenated or interpolated directly into a SQL query string, allowing SQL injection.',
    remediation:
      'Use parameterized queries / prepared statements. Never concatenate user input into SQL strings.',
  },
  {
    rule_id: 'PY-SQL-002',
    name: 'SQL Injection — f-string query',
    category: 'sql_injection',
    severity: 'HIGH',
    description:
      'An f-string is used to build a SQL query. f-strings interpolate values directly and bypass parameterization.',
    remediation: 'Replace f-string SQL with parameterized queries using placeholders and bound parameters.',
  },
  {
    rule_id: 'PY-CMD-001',
    name: 'Command Injection — os.system',
    category: 'command_injection',
    severity: 'CRITICAL',
    description:
      'os.system() executes a shell command built from user-controlled input, enabling command injection.',
    remediation:
      'Use subprocess.run with a list of arguments and shell=False. Validate and sanitize all inputs.',
  },
  {
    rule_id: 'PY-CMD-002',
    name: 'Command Injection — shell=True',
    category: 'command_injection',
    severity: 'CRITICAL',
    description:
      'subprocess is invoked with shell=True and a string command, allowing shell metacharacter injection.',
    remediation: 'Pass a list of arguments with shell=False. Avoid shell=True entirely with user input.',
  },
  {
    rule_id: 'SEC-SECRET-001',
    name: 'Hardcoded Secret — API key / token',
    category: 'hardcoded_secret',
    severity: 'CRITICAL',
    description:
      'A high-entropy string matching known API key or token patterns is hardcoded in source.',
    remediation: 'Load secrets from environment variables or a secrets manager. Never commit credentials.',
  },
  {
    rule_id: 'SEC-SECRET-002',
    name: 'Hardcoded Secret — password literal',
    category: 'hardcoded_secret',
    severity: 'HIGH',
    description: 'A password-like literal is assigned to a variable whose name suggests a credential.',
    remediation: 'Move credentials to environment variables or a vault. Rotate any leaked credentials.',
  },
  {
    rule_id: 'PY-CRYPTO-001',
    name: 'Weak Cryptography — MD5/SHA1',
    category: 'weak_crypto',
    severity: 'MEDIUM',
    description: 'A broken hash function (MD5 or SHA1) is used, which is collision-vulnerable.',
    remediation: 'Use SHA-256 or stronger from hashlib, or a dedicated password hashing library.',
  },
  {
    rule_id: 'PY-CRYPTO-002',
    name: 'Weak Cryptography — insecure random',
    category: 'weak_crypto',
    severity: 'MEDIUM',
    description: 'The random module is used where a cryptographically secure random value is required.',
    remediation: 'Use secrets module or os.urandom for security-sensitive randomness.',
  },
  {
    rule_id: 'PY-PATH-001',
    name: 'Path Traversal — user-controlled path',
    category: 'path_traversal',
    severity: 'HIGH',
    description:
      'A filesystem path is built from user input without normalization or boundary checks, allowing path traversal.',
    remediation: 'Normalize the path with os.path.realpath and verify it stays within an allowed base directory.',
  },
  {
    rule_id: 'PY-LOG-001',
    name: 'Insecure Logging — secret logged',
    category: 'insecure_logging',
    severity: 'MEDIUM',
    description: 'A variable whose name suggests a secret (password, token, key) is passed to a logging call.',
    remediation: 'Never log credentials or tokens. Redact sensitive fields before logging.',
  },
  {
    rule_id: 'PY-SSRF-001',
    name: 'SSRF — user-controlled URL fetch',
    category: 'ssrf',
    severity: 'HIGH',
    description:
      'An HTTP request is made to a URL built from user input without an allowlist, enabling SSRF.',
    remediation: 'Validate URLs against an allowlist of permitted hosts. Block internal/private IP ranges.',
  },
  {
    rule_id: 'WEB-CORS-001',
    name: 'Unsafe CORS — wildcard origin',
    category: 'unsafe_cors',
    severity: 'MEDIUM',
    description:
      'Access-Control-Allow-Origin is set to a wildcard, allowing any origin to read responses to credentialed requests.',
    remediation: 'Reflect a specific allowlisted origin. Never combine wildcard origins with credentials.',
  },
  {
    rule_id: 'WEB-AUTH-001',
    name: 'Missing Authentication — sensitive route',
    category: 'missing_auth',
    severity: 'HIGH',
    description:
      'A route decorator suggests a sensitive operation but no authentication check is applied.',
    remediation: 'Require an authenticated session or API key for all sensitive endpoints.',
  },
  {
    rule_id: 'PY-DESERIAL-001',
    name: 'Insecure Deserialization — pickle',
    category: 'insecure_deserialization',
    severity: 'CRITICAL',
    description:
      'pickle.loads (or yaml unsafe load) is used on data that may be attacker-controlled, enabling arbitrary code execution.',
    remediation: 'Use a safe serialization format (JSON) or an explicit schema. Never unpickle untrusted data.',
  },
];

export const RULES_BY_ID: Record<string, Rule> = Object.fromEntries(
  RULES.map((r) => [r.rule_id, r]),
);
