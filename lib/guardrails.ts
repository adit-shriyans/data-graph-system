const FORBIDDEN_PATTERNS = [
  /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE)\b/i,
  /\b(EXEC|EXECUTE|CALL)\b/i,
  /;\s*(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE)/i,
  /--/,
  /\/\*/,
];

export function validateSql(sql: string): { valid: boolean; reason?: string } {
  const trimmed = sql.trim();

  if (!trimmed.toUpperCase().startsWith("SELECT") && !trimmed.toUpperCase().startsWith("WITH")) {
    return { valid: false, reason: "Only SELECT queries are allowed" };
  }

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { valid: false, reason: `Forbidden SQL pattern detected: ${pattern}` };
    }
  }

  const semicolonCount = (trimmed.match(/;/g) || []).length;
  if (semicolonCount > 1) {
    return { valid: false, reason: "Multiple statements not allowed" };
  }

  return { valid: true };
}

export function isOffTopic(response: { relevant: boolean }): boolean {
  return !response.relevant;
}
