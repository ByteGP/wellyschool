# Release checklist

Work through `ACCEPTANCE_TESTS.md` in the build pack; this checklist covers the
operational steps around it.

## One-time setup (owner)

- [ ] Netlify site linked to `ByteGP/wellyschool` for continuous deploys
      (Project configuration > Build & deploy > Link repository; install the
      Netlify GitHub App and grant it access to the repo). Build `npm run build`,
      publish `dist` (these come from `netlify.toml`).
- [ ] Deploy Previews enabled for pull requests.
- [ ] To GO LIVE with approved content only: change
      `[context.production.environment]` `CONTENT_MODE` in `netlify.toml` from
      `preview` to `production` through a reviewed PR. During the pilot it stays
      `preview` so the in_review curriculum is visible on the live site.
- [ ] GitHub OAuth app created (callback `https://api.netlify.com/auth/done`).
- [ ] Netlify GitHub auth provider configured with the OAuth Client ID/Secret (never committed).
- [ ] `astro.config.mjs` `site` updated to the real Netlify URL.
- [ ] CODEOWNERS placeholder handles replaced with real GitHub usernames.
- [ ] `main` protected: PRs required, 1+ approval, CODEOWNERS review, `quality`
      check required, stale approvals dismissed, force pushes and deletions blocked.
- [ ] CMS editors added as repository collaborators (minimum role that can
      create branches and PRs).

## Every release

- [ ] `npm ci && npm run check && npm run test && npm run build` passes locally or in CI.
- [ ] `npm run test:e2e` passes (includes axe checks).
- [ ] Manual keyboard and screen-reader spot test on one Teacher and one Family route.
- [ ] Print spot test: Teach Now card fits A4; family guide and one resource print cleanly.
- [ ] Only content with completed reviews is `approved`/`scheduled`/`published`.
- [ ] Schedule entries for upcoming Sundays are approved and correct in Pacific/Auckland.
- [ ] Tag the release: `git tag -a vX.Y.Z -m "..." && git push --tags`.

## Pilot workflow test (definition of done)

- [ ] Edit one seed lesson in Decap (no theology changes) → draft saves as branch + PR.
- [ ] Netlify Deploy Preview builds; draft content visible in preview only.
- [ ] `quality` check passes; CODEOWNERS review; merge through GitHub.
- [ ] Production updates; Teacher and Family routes render the same lesson record.
- [ ] Both routes usable on a phone without an account; print works from both.

## Rollback

- Netlify: publish the previous known-good deploy from the Deploys screen.
- Content: `git revert` the merge commit via a PR so checks and reviews apply.
