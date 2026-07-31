"use client";

import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Client island for /auth/confirm (P9.5-T0). Doubles as both halves of the
 * scanner-proof handoff:
 *
 * 1. The no-JS fallback — server-rendered as a plain, visible "Confirm
 *    sign-in" submit button. A browser with JS disabled (or a scanner that
 *    never executes it) sees exactly this and nothing more happens on its
 *    own — the token is only ever exchanged once something POSTs the form.
 * 2. The auto-submit — once mounted, calls `requestSubmit()` on its own
 *    parent <form> exactly once (the `fired` ref survives React Strict
 *    Mode's dev-only double-invoke of effects, since it's the same ref
 *    instance across that synthetic remount) so a real visitor's click
 *    doesn't have to land on the button at all.
 *
 * `useFormStatus` only reads the status of the nearest ANCESTOR <form>, so
 * this component must be rendered as a descendant of the <form> it submits
 * (see page.tsx) — it cannot supply that form itself.
 */
export function AutoSubmit() {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const fired = useRef(false);
  const { pending } = useFormStatus();

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    buttonRef.current?.form?.requestSubmit();
  }, []);

  return (
    <Button ref={buttonRef} type="submit" className="w-full" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
          Confirming…
        </>
      ) : (
        "Confirm sign-in"
      )}
    </Button>
  );
}
