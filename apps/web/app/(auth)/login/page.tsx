import type { Metadata } from "next";
import { HeroBackdrop } from "@/components/brand/backdrop";
import { ModuleMark, Reveal } from "@/components/brand/magic";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Log in",
  robots: { index: false },
};

export default async function LoginPage(props: PageProps<"/login">) {
  const params = await props.searchParams;
  const initialError =
    params.verified === "0"
      ? "That link didn't work or has expired — enter your email to get a new one."
      : undefined;

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-background px-6 py-16">
      <HeroBackdrop />

      <div className="relative flex w-full max-w-sm flex-col items-center">
        <span className="mb-8 flex items-center gap-2.5 font-display text-lg font-bold tracking-tight">
          <ModuleMark className="size-3.5 text-primary" />
          QRCDN
        </span>

        <Reveal className="w-full">
          <div className="rounded-3xl bg-gradient-to-b from-primary/40 via-border/70 to-border/30 p-px shadow-2xl shadow-primary/15">
            <div className="rounded-[calc(1.5rem-1px)] bg-card/90 p-8 backdrop-blur-xl sm:p-9">
              <div className="mb-6 flex flex-col gap-1.5 text-center">
                <h1 className="font-display text-xl font-semibold tracking-tight text-foreground">
                  Welcome back
                </h1>
                <p className="text-sm text-muted-foreground">
                  Sign in to manage your codes.
                </p>
              </div>
              <LoginForm initialError={initialError} />
            </div>
          </div>
        </Reveal>

        <p className="mt-8 font-mono text-xs text-muted-foreground">
          your code never dies
        </p>
      </div>
    </div>
  );
}
