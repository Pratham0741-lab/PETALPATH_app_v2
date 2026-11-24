/**
 * The URL to put in logs. A child deletion's URL carries the deleted child's
 * id (DELETE /api/children/<id>), which must not outlive the child in the
 * logs, so it is masked. Every other URL is logged unchanged.
 */
const CHILD_DELETE = /^(\/api\/children\/)[^/?#]+/;

export function logSafeUrl(method: string | undefined, url: string | undefined): string | undefined {
  if (!url || method?.toUpperCase() !== 'DELETE') return url;
  return url.replace(CHILD_DELETE, '$1:id');
}
