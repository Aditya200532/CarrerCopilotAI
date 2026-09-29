import { ApiError } from '../utils/ApiError.js';

/**
 * Validates a request segment against a Zod schema and replaces it with the
 * parsed (coerced, stripped) result. Usage: router.post('/', validate({ body: schema }), handler)
 */
export function validate(schemas) {
  return (req, _res, next) => {
    try {
      for (const key of ['params', 'query', 'body']) {
        if (schemas[key]) {
          req[key] = schemas[key].parse(req[key]);
        }
      }
      next();
    } catch (err) {
      if (err.name === 'ZodError') {
        const details = err.errors.map((e) => `${e.path.join('.') || '(root)'}: ${e.message}`);
        return next(ApiError.badRequest('Validation failed', details));
      }
      next(err);
    }
  };
}
