// Read-only summary feed for the calendar integration.
//
// Emits one static JSON file per scheduled lesson at
//   /l/<date>/<class>.json
// so a teacher reminder can show what the week's lesson is about (title,
// passages, big idea) and link to it. Served from Netlify's CDN, so the
// calendar's reminder job just does a plain GET; if it ever fails, the
// calendar can still build the /l/<date>/<class> redirect URL by string
// concat (see _redirects). No auth, no private data.
import type { APIRoute, GetStaticPaths, InferGetStaticPropsType } from 'astro';
import { getLessonLinks } from '../../../lib/integration/lesson-links';
import { CONTENT_MODE } from '../../../lib/content/site';

export const getStaticPaths = (() =>
  getLessonLinks(CONTENT_MODE).map((link) => ({
    params: { date: link.date, class: link.class },
    props: { link },
  }))) satisfies GetStaticPaths;

type Props = InferGetStaticPropsType<typeof getStaticPaths>;

export const GET: APIRoute = ({ props }) => {
  const { link } = props as Props;
  const body = {
    date: link.date,
    class: link.class,
    lessonId: link.lessonId,
    title: link.title,
    passages: link.passages,
    bigIdea: link.bigIdea,
    lessonPath: link.lessonPath,
    preparePath: link.preparePath,
  };
  return new Response(`${JSON.stringify(body, null, 2)}\n`, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
