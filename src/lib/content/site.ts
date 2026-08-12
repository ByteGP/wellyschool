// Build-time site context shared by pages.
import { resolveContentMode, type ContentMode } from './mode';

export const CONTENT_MODE: ContentMode = resolveContentMode(process.env.CONTENT_MODE);

/** Preview builds must not be indexed; production lesson routes may be. */
export const NOINDEX: boolean = CONTENT_MODE === 'preview';
