import type { Curriculum } from '../../types';

export type Segment = Curriculum['segment'];

export const SEGMENTS: readonly Segment[] = ['Kids', 'Youths', 'Teens'];

export const SEGMENT_SLUGS = {
  kids: 'Kids',
  youths: 'Youths',
  teens: 'Teens',
} as const satisfies Record<string, Segment>;

export type SegmentSlug = keyof typeof SEGMENT_SLUGS;

export const SEGMENT_AGE_RANGES: Record<Segment, string> = {
  Kids: 'Ages 4-8',
  Youths: 'Ages 9-12',
  Teens: 'Ages 13-17',
};

export function segmentFromSlug(slug: string): Segment | undefined {
  return (SEGMENT_SLUGS as Record<string, Segment>)[slug];
}

export function slugFromSegment(segment: Segment): SegmentSlug {
  const slug = (Object.keys(SEGMENT_SLUGS) as SegmentSlug[]).find(
    (key) => SEGMENT_SLUGS[key] === segment,
  );
  if (!slug) throw new Error(`Unknown segment: ${segment}`);
  return slug;
}
