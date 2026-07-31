import { highlight, type CodeLang } from "@/lib/highlight";
import { cn } from "@/lib/utils";
import { CopyButton } from "./copy-button";

/**
 * Shared shiki-highlighted code frame (P9.5-T1b) — async server component:
 * `highlight()` runs at render time on the server; the browser never
 * loads shiki (verify: `pnpm --filter web build`, grep `.next/static` for
 * a shiki chunk — there should be none). The frame (hairline border,
 * `radius-lg`, `text-code`, horizontal scroll, optional mono title bar,
 * `bg-code-bg`) is ours; the syntax-highlighted markup inside is shiki's,
 * via `dangerouslySetInnerHTML` — safe here because the HTML comes from
 * our own theme (`lib/code-theme.ts`) applied to our own `code`/`lang`
 * props, never to visitor-submitted content.
 */
export async function CodeBlock({
  code,
  lang,
  title,
  className,
}: {
  code: string;
  lang: CodeLang;
  title?: string;
  className?: string;
}) {
  const html = await highlight(code, lang);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-code-bg",
        className,
      )}
    >
      {title && (
        <div className="border-b border-border/60 px-4 py-2">
          <span className="font-mono text-xs text-muted-foreground">{title}</span>
        </div>
      )}
      <div className="relative">
        <CopyButton code={code} className="absolute right-2 top-2" />
        <div
          className="overflow-x-auto p-4 pr-12 font-mono text-code [&_pre]:m-0"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}
