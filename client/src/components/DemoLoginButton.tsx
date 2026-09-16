import { Play } from "lucide-react";

import { useDemoLogin } from "../lib/useDemoLogin.ts";
import { Button } from "./ui/button.tsx";

export default function DemoLoginButton() {
  const { startDemo, loading, error } = useDemoLogin();

  return (
    <div className="mt-6">
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
        Everyone shares this account, so treat anything you make in it as public. The whole
        site resets every few hours.
      </p>

      {error && (
        <p role="alert" className="mt-2 text-center text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
