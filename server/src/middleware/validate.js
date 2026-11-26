/**
 * Generic zod validation middleware. Parsed data is placed on
 * `res.locals.input` so handlers never touch raw request data.
 */
import { HttpError } from '../utils/httpError.js';

/**
 * @param {import('zod').ZodType} schema
 * @param {'body' | 'query'} [source='body']
 * @returns {import('express').RequestHandler}
 */
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source] ?? {});
    if (!result.success) {
      const details = result.error.issues.slice(0, 5).map((i) => ({
        field: i.path.join('.') || source,
        message: i.message,
      }));
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
