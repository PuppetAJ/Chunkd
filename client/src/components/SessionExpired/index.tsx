import { useState } from "react";
import { useApolloClient, useMutation } from "@apollo/client/react";

import { LOGIN_USER } from "../../utils/mutations.ts";
import { useAuthStore } from "../../lib/auth.ts";
import { requestErrorMessage } from "../../lib/credentials.ts";
import { Button } from "../ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog.tsx";
import { Input } from "../ui/input.tsx";
import { Label } from "../ui/label.tsx";

/**
 * Sign back in without leaving the editor.
 *
 * A token lasts a fixed two hours and a world exists nowhere but in this page,
 * so being sent to the login page when one runs out threw away however long
 * someone had spent building. This asks in place instead, and the world behind
 * it is never unmounted.
 */
export default function SessionExpired() {
  const logIn = useAuthStore((state) => state.logIn);
  const lastEmail = useAuthStore((state) => state.lastEmail);
  const apollo = useApolloClient();

  const [email, setEmail] = useState(lastEmail ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [login, { loading }] = useMutation(LOGIN_USER);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      const { data } = await login({ variables: { email: email.trim(), password } });
      logIn((data as { login: { token: string } }).login.token);
      // Anything cached under the old session belongs to the old session.
      await apollo.resetStore();
    } catch (requestError) {
      setError(requestErrorMessage(requestError));
    }
  };

  return (
    // Nothing dismisses this: every way out of it other than signing in leads
    // to a world that cannot be saved.
    <Dialog open>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Your session ended</DialogTitle>
          <DialogDescription>
            Two hours is as long as a sign-in lasts. Your world is still here and nothing has been
            lost. Sign in and you will be put straight back into it.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="sessionEmail">Email</Label>
            <Input
              id="sessionEmail"
              name="sessionEmail"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sessionPassword">Password</Label>
            <Input
              id="sessionPassword"
              name="sessionPassword"
              type="password"
              autoComplete="current-password"
              autoFocus
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            Do not reload this page until you have signed in and saved. The world is held here
            rather than on the server.
          </p>

          <DialogFooter>
            <Button type="submit" disabled={loading || !email || !password}>
              {loading ? "Signing in..." : "Sign in and keep building"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
