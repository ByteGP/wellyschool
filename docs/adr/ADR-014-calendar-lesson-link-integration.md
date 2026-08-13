# ADR-014: Calendar to lesson-site link integration

**Status:** Accepted (owner decision, 2026-08-14).

## Context

The church calendar (`calendar.wellingtoncoc.com`, a separate Supabase +
Netlify app) emails each Sunday School teacher a reminder before they serve.
We want that reminder to link to the prepared lesson for that week on this
site, and ideally straight to the "Prepare before class" section, plus a short
summary of what the lesson is about.

The two systems must stay loosely coupled: no shared database, no shared schema,
no write access in either direction, and each must be able to deploy
independently. The calendar side already knows, per event, the date and the
class role (`Kids Class Teacher`, `Youth Class Teacher`, `Teenage Class
Teacher`, `Adult Class Teacher`).

This site already computes, at build time, exactly which lesson lands on which
Sunday for each class (the effective schedule, ADR-013). So the mapping the
calendar needs is a read of information we already own.

## Decision

Expose two static, read-only, public-safe surfaces, both generated from the
effective schedule so the `(date, class) -> lesson` mapping stays a single
source of truth here. Nothing is written back.

### 1. Deterministic redirect URLs (`dist/_redirects`)

For every scheduled lesson, an `astro:build:done` integration
(`astro.config.mjs`, using `src/lib/integration/redirects.mjs`) emits Netlify
redirect rules:

```
/l/<date>/<class>            -> /teacher/<class>/<lesson-id>/          (301)
/l/<date>/<class>/prepare    -> /teacher/<class>/<lesson-id>/#prepare  (301)
```

followed by per-class fallbacks so any date without a scheduled lesson still
resolves safely instead of 404ing:

```
/l/:date/<class>             -> /teacher/<class>/                       (302)
/l/:date/<class>/prepare     -> /teacher/<class>/                       (302)
```

`<class>` is the lesson-site slug: `kids`, `youths`, `teens`. Exact rules are
listed first so they win over the fallbacks. Targets are site-relative, so the
surface is domain-agnostic (works on the pilot host or the final subdomain).

The calendar builds these URLs by plain string concatenation from the event's
**Pacific/Auckland civil date** (not the stored UTC instant) and the role slug,
with no request to this site at send time. The link therefore works even if
this site is briefly unreachable when a reminder is sent.

### 2. Lesson summary feed (`/l/<date>/<class>.json`)

A static endpoint (`src/pages/l/[date]/[class].json.ts`) emits one JSON file per
scheduled lesson:

```json
{
  "date": "2026-08-30",
  "class": "kids",
  "lessonId": "K1-L01",
  "title": "God Made a Good World",
  "passages": "Genesis 1:1-25; Genesis 1:31",
  "bigIdea": "God made and ordered a good world.",
  "lessonPath": "/teacher/kids/k1-l01/",
  "preparePath": "/teacher/kids/k1-l01/#prepare"
}
```

The calendar's reminder job does a plain CDN `GET` of this file to include the
title / passages / big idea in the email. If the fetch fails, the reminder can
still include the redirect link from (1). Only the same public fields the
teacher page header already shows are exposed; no private or editorial data.

### 3. Deep link into "Prepare before class"

The teacher lesson page's Prepare section is a collapsed `<details id="prepare">`.
A small inline script opens it and scrolls to it when the page is loaded with
`#prepare`, so the reminder's "Start preparing" link lands the teacher directly
in prep.

### Role -> slug map (calendar side)

| Calendar `role_label`  | URL `<class>` |
| ---------------------- | ------------- |
| Kids Class Teacher     | `kids`        |
| Youth Class Teacher    | `youths`      |
| Teenage Class Teacher  | `teens`       |
| Adult Class Teacher    | (no link: this site has no adult content) |

## Consequences

- The feed and redirects follow the same content-mode gate as the pages
  (`CONTENT_MODE`), so in production only approved lessons are exposed; in the
  preview-mode pilot the whole in-review curriculum is covered. Empty schedules
  (e.g. real production before any lesson is approved) simply produce the
  fallbacks only.
- The mapping lives entirely here. The calendar needs no schema knowledge beyond
  the URL shape and the slug map above; either side can change independently.
- No new storage, no auth, no shared secret, no writes. Adding push-style sync
  later (Supabase webhooks, etc.) remains possible but is out of scope.
- Netlify `_redirects` is required for the redirect surface; the JSON feed works
  on any static host.
