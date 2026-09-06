import { Play } from "lucide-react";

import { useDemoLogin } from "../lib/useDemoLogin.ts";
import { Button } from "./ui/button.tsx";

/**
 * Sign in as the shared demo account.
 *
 * Making an account before you can see whether the app is worth an account is
 * the wrong way round for something people are mostly here to look at. This
 * signs them straight in instead.
 *
 * It lives on both auth pages, so the click handling is here rather than
 * written out twice.
 */
export default function DemoLoginButton() {
  const { startDemo, loading, error } = useDemoLogin();

  return (
    <div className="mt-6">
      {/* A labelled rule, so the demo reads as an alternative to the form
          above rather than another step in it. */}
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <Button
        type="button"
        variant="outline"
        className="mt-4 w-full"
        onClick={startDemo}
        disabled={loading}
      >
        <Play />
        {loading ? "Opening the demo..." : "Explore with a demo account"}
      </Button>

      <p className="mt-2 text-center text-xs text-muted-foreground">
        Everyone shares this account, so treat anything you make in it as public.
      </p>

      {error && (
        <p role="alert" className="mt-2 text-center text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
