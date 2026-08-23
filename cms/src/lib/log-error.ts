/**
 * Logs an error so that it can actually be read.
 *
 * Strapi's validation throws an `AggregateError`, whose `message` is literally
 * "N errors occurred" — the causes sit in `.errors` and appear nowhere in the
 * output. A nightly job that failed therefore logged a sentence containing no
 * information about what went wrong, which is how a seed that had been failing
 * every night went unnoticed: the line was there, it just said nothing.
 *
 * These paths run unattended, so the log is the only account of what happened.
 */
export function logError(context: string, error: any): void {
  const causes: any[] = Array.isArray(error?.errors) && error.errors.length > 0
    ? error.errors
    : [error];

  for (const cause of causes) {
    const message = cause?.message || String(cause);
    const where = Array.isArray(cause?.path) && cause.path.length > 0
      ? ` at ${cause.path.join('.')}`
      : '';
    const details = cause?.details && Object.keys(cause.details).length > 0
      ? ` — ${JSON.stringify(cause.details)}`
      : '';

    strapi.log.error(`${context}: ${message}${where}${details}`);
  }
}
