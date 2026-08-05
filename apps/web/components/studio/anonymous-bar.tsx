import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * The signed-out studio's kit-bar slot (P9.8-B4): where an account renders
 * KitBar, an anonymous visitor gets the first of the page's two account
 * incentives (the other is the rail's make-it-dynamic line). Board's brief:
 * "smart yet subtle" — one honest line and one button, in TopBar's exact
 * shell so the layout doesn't shift between the two states. The
 * no-watermark promise moved here from the landing playground's lede
 * (P9.8-B4; the claim's home is the tool it's true of).
 */
export function AnonymousBar() {
  return (
    <div className="border-b border-border/60 bg-background">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 lg:px-8">
        <p className="text-sm text-muted-foreground">
          Free static codes: no account, no watermark. An account saves this design as a brand kit
          your codes can follow.
        </p>
        <Button asChild size="sm" variant="outline" className="shrink-0">
          <Link href="/login">Start free</Link>
        </Button>
      </div>
    </div>
  );
}
