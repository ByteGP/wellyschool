// Origin lock for the members proxy.
//
// When MEMBERS_PROXY_SECRET is set, this site only answers requests that carry
// the matching `x-members-proxy` header, which the main site's members proxy
// edge function adds. Any other (direct) request is sent to the members
// entrance on the main site, so the lesson content is never served straight
// from this origin. With the secret unset the function is inert, so it is safe
// to deploy before Eugene sets the secret on both sites, and the deploy preview
// stays viewable (the secret is unset on wellyschool-pilot).
//
// Runs on Netlify's edge (Deno); not part of the Astro/npm build, so it is
// excluded from tsconfig. The ambient declaration below keeps it self-typed.

declare const Netlify: { env: { get(key: string): string | undefined } };

export default async (request: Request): Promise<Response | undefined> => {
  const secret = Netlify.env.get('MEMBERS_PROXY_SECRET');
  if (!secret) return undefined; // not configured: serve normally
  if (request.headers.get('x-members-proxy') === secret) return undefined; // via the proxy
  return Response.redirect('https://wellingtoncoc.com/members/sunday-school/', 302);
};

export const config = { path: '/*' };
