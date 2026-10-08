// Base-path helper for the members-area proxy.
//
// import.meta.env.BASE_URL is '/' for the standalone site
// (sundayschool.wellingtoncoc.com) and '/members/sunday-school/' when built
// with MEMBERS_BASE_PATH for the main site's /members proxy. Astro prefixes
// asset imports with the base automatically, but it does NOT rewrite
// hand-written href/src strings or site-relative paths we emit to JSON or
// redirects, so route every one of those through withBase().
export function withBase(path: string): string {
  if (!path) return path;
  // External URLs, protocol-relative, and fragment-only links pass through.
  if (/^[a-z][a-z0-9+.-]*:/i.test(path) || path.startsWith('//') || path.startsWith('#')) {
    return path;
  }
  // BASE_URL may or may not carry a trailing slash depending on how `base` is
  // set, so normalise the join to exactly one slash between the two.
  const base = import.meta.env.BASE_URL || '/';
  const b = base.endsWith('/') ? base.slice(0, -1) : base;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${b}${p}`;
}
