/**
 * Turn zod issues into a short, client-safe list of `{ field, message }`.
 * Shared by request validation and LLM output validation.
 */

const MAX_REPORTED_ISSUES = 5;

/**
 * @param {import('zod').ZodError} error
 * @param {string} [rootName] label used when an issue has no path (defaults to "(root)")
 * @returns {{ field: string, message: string }[]} at most five issues
 */
export function summarizeIssues(error, rootName = '(root)') {
  return error.issues.slice(0, MAX_REPORTED_ISSUES).map((issue) => ({
    field: issue.path.join('.') || rootName,
    message: issue.message,
  }));
}
