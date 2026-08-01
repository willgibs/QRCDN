import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BLOG_POSTS, getBlogPost } from "@/lib/blog";
import { POST_COMPONENTS } from "@/components/marketing/blog/post-registry";
import { BlogPostShell } from "@/components/marketing/blog/post-shell";

// /blog/[slug] (P9.5-T-R) — the file-based MDX dynamic-import-by-slug
// pattern (bundled Next 16 docs, 01-app/02-guides/mdx.md's "Using dynamic
// imports" section) adapted to typed TSX: generateStaticParams enumerates
// the 4 real launch posts, dynamicParams = false 404s anything else before
// this component ever runs (same contract MDX's own recipe documents for
// `dynamicParams: false`). Static route, no data fetching: renders
// `● (SSG)` in `next build` output, same category as /u/[slug].
export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export const dynamicParams = false;

export async function generateMetadata(
  props: PageProps<"/blog/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const post = getBlogPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.dek,
  };
}

export default async function BlogPostPage(props: PageProps<"/blog/[slug]">) {
  const { slug } = await props.params;
  const post = getBlogPost(slug);
  const Body = POST_COMPONENTS[slug];
  if (!post || !Body) {
    notFound();
  }

  return (
    <BlogPostShell post={post}>
      <Body />
    </BlogPostShell>
  );
}
