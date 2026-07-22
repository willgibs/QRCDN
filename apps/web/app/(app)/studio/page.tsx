import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/explore/magic";

// D9: all (app) routes are force-dynamic so the getClaims() guard below runs
// fresh on every request rather than riding a cached response.
export const dynamic = "force-dynamic";

export default async function StudioPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background px-6 text-center">
      <Eyebrow>Studio</Eyebrow>
      <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        Studio coming in P4
      </h2>
      <p className="max-w-md text-sm text-muted-foreground">
        You&apos;re signed in — the generator and brand-kit editor land in the
        next phase.
      </p>
    </div>
  );
}
