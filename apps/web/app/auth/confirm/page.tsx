import type { Metadata } from "next";
import Link from "next/link";
import { HeroBackdrop } from "@/components/brand/backdrop";
import { ModuleMark } from "@/components/brand/magic";
import { Button } from "@/components/ui/button";
import { confirmSignInAction } from "./actions";
import { AutoSubmit } from "./auto-submit";

// Scanner-proof by construction (P9.5-T0): this page is a pure render on
// GET — it never reads token_hash/type/next for anything but hidden form
// fields, and never calls verifyOtp (that only happens inside
// confirmSignInAction, a POST-only server action). Never cache this route:
// a cached response would serve one visitor's token_hash/type to a
// completely different visitor.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Confirming sign-in",
  robots: { index: false },
};

function isNonEmptyString(value: string | string[] | undefined): value is string {
  return typeof value === "string" && value.length > 0;
}

export default async function ConfirmSignInPage(props: PageProps<"/auth/confirm">) {
  const params = await props.searchParams;
  const tokenHash = params.token_hash;
  const type = params.type;
  const next = params.next;

  const valid = isNonEmptyString(tokenHash) && isNonEmptyString(type);

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-background px-6 py-16">
      <HeroBackdrop />

      <div className="relative flex w-full max-w-sm flex-col items-center">
        <span className="mb-8 flex items-center gap-2.5 font-display text-lg font-bold tracking-tight">
          <ModuleMark className="size-3.5 text-primary" />
          QRCDN
        </span>

        <div className="w-full rounded-3xl bg-gradient-to-b from-primary/40 via-border/70 to-border/30 p-px shadow-2xl shadow-primary/15">
          <div className="rounded-[calc(1.5rem-1px)] bg-card/90 p-8 text-center backdrop-blur-xl sm:p-9">
            {valid ? (
              <>
                <div className="mb-6 flex flex-col gap-1.5">
                  <h1 className="font-display text-xl font-semibold tracking-tight text-foreground">
                    Confirming your sign-in…
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Press the button below if this doesn&apos;t continue on its own.
                  </p>
                </div>

                <form action={confirmSignInAction} className="flex flex-col gap-3">
                  <input type="hidden" name="token_hash" value={tokenHash} />
                  <input type="hidden" name="type" value={type} />
                  {isNonEmptyString(next) && <input type="hidden" name="next" value={next} />}
                  <AutoSubmit />
                </form>
              </>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <h1 className="font-display text-xl font-semibold tracking-tight text-foreground">
                    That link isn&apos;t valid.
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    It&apos;s missing something it needs. Request a fresh one.
                  </p>
                </div>
                <Button asChild className="w-full">
                  <Link href="/login?auth_error=link_invalid">Back to sign in</Link>
                </Button>
              </div>
            )}
          </div>
        </div>

        <p className="mt-8 font-mono text-xs text-muted-foreground">your code never dies</p>
      </div>
    </div>
  );
}
