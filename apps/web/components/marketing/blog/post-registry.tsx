import type { ComponentType } from "react";
import { WhatActuallyScansPost } from "@/components/marketing/blog/posts/what-actually-scans";
import { RedirectsThatOutliveUsPost } from "@/components/marketing/blog/posts/redirects-that-outlive-us";
import { CountingWithoutTrackingPost } from "@/components/marketing/blog/posts/counting-without-tracking";
import { WhyOpenSourcePost } from "@/components/marketing/blog/posts/why-open-source";

/**
 * slug -> post-body component (P9.5-T-R). The typed-TSX alternative to an
 * MDX dynamic-import-by-slug: `BLOG_POSTS` (lib/blog.ts) carries metadata,
 * this map carries the matching JSX. Both are keyed by the same slug
 * string, and blog.test.ts's `REQUIRED_SLUGS` pins that every slug in one
 * has a counterpart in the other.
 */
export const POST_COMPONENTS: Record<string, ComponentType> = {
  "what-actually-scans": WhatActuallyScansPost,
  "redirects-that-outlive-us": RedirectsThatOutliveUsPost,
  "counting-without-tracking": CountingWithoutTrackingPost,
  "why-open-source": WhyOpenSourcePost,
};
