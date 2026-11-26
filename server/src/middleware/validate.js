/**
 * Generic zod validation middleware. Parsed data is placed on
 * `res.locals.input` so handlers never touch raw request data.
 */
import { HttpError } from '../utils/httpError.js';
import { summarizeIssues } from '../utils/zodIssues.js';

/**
 * @param {import('zod').ZodType} schema
 * @param {'body' | 'query'} [source] where to read input from (defaults to the body)
 * @returns {import('express').RequestHandler} middleware that rejects invalid input with 400
 */
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source] ?? {});
    if (!result.success) {
      const details = summarizeIssues(result.error, source);
      return next(
        new HttpError(400, 'Some of the information sent was invalid.', {
          code: 'VALIDATION_ERROR',
          details,
        }),
      );
    }
    res.locals.input = result.data;
    return next();
  };
}
