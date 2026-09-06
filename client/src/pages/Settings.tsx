import { useEffect, useState } from "react";
import { useApolloClient, useMutation, useQuery } from "@apollo/client/react";
import { toast } from "sonner";

import { QUERY_ME_BASIC } from "../utils/queries.ts";
import { CHANGE_PASSWORD, UPDATE_ACCOUNT } from "../utils/mutations.ts";
import { useAuthStore } from "../lib/auth.ts";
import {
  emailError,
  passwordError,
  requestErrorMessage,
  usernameError,
  MIN_PASSWORD_LENGTH,
} from "../lib/credentials.ts";
import { PasswordInput } from "./Login.tsx";
import UserAvatar from "../components/UserAvatar.tsx";
import { Button } from "../components/ui/button.tsx";
import { Input } from "../components/ui/input.tsx";
import { Label } from "../components/ui/label.tsx";
import { Skeleton } from "../components/ui/skeleton.tsx";

interface MeBasic {
  username: string;
  email: string;
}

/**
 * Account settings.
 *
 * The two forms are separate on purpose. Changing a password asks for the
 * current one and should not be bundled into a form someone opened to fix a
 * typo in their email.
 */
export default function Settings() {
  const logIn = useAuthStore((state) => state.logIn);
  const apollo = useApolloClient();
  const { loading, data } = useQuery(QUERY_ME_BASIC);
  const me = (data as { me?: MeBasic } | undefined)?.me ?? null;

  if (loading && !me) return <SettingsSkeleton />;

  if (!me) {
    return (
      <p className="text-sm text-muted-foreground">Your account could not be loaded.</p>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <header className="flex items-center gap-4">
        <UserAvatar username={me.username} size="lg" />
        <div>
          <h1 className="font-display text-2xl">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Signed in as {me.username}.
          </p>
        </div>
      </header>

      <ProfileForm me={me} logIn={logIn} apollo={apollo} />
      <PasswordForm logIn={logIn} />
    </div>
  );
}

type LogIn = (token: string) => void;

function ProfileForm({
  me,
  logIn,
  apollo,
}: {
  me: MeBasic;
  logIn: LogIn;
  apollo: ReturnType<typeof useApolloClient>;
}) {
  const [username, setUsername] = useState(me.username);
  const [email, setEmail] = useState(me.email);
  const [errors, setErrors] = useState<{ username?: string | null; email?: string | null }>({});

  // The fields start as whatever the server last said, including after a save.
  useEffect(() => {
    setUsername(me.username);
    setEmail(me.email);
  }, [me.username, me.email]);

  const [updateAccount, { loading }] = useMutation(UPDATE_ACCOUNT);
  const unchanged = username.trim() === me.username && email.trim() === me.email;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const problems = { username: usernameError(username), email: emailError(email) };
    setErrors(problems);
    if (problems.username || problems.email) return;

    try {
      const { data } = await updateAccount({
        variables: { username: username.trim(), email: email.trim() },
      });
      const result = data as { updateAccount: { token: string } };
      // The name inside the token is now stale, so the new one replaces it.
      logIn(result.updateAccount.token);
      // Usernames appear on every post, so everything cached is now suspect.
      await apollo.refetchQueries({ include: "active" });
      toast.success("Your details were saved");
    } catch (error) {
      toast.error(requestErrorMessage(error));
    }
  };

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <h2 className="font-medium">Your details</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Your username is what other builders see on your posts.
      </p>

      <form className="mt-4 space-y-4" onSubmit={handleSubmit} noValidate>
        <div className="space-y-2">
          <Label htmlFor="settingsUsername">Username</Label>
          <Input
            id="settingsUsername"
            name="username"
            value={username}
            aria-invalid={Boolean(errors.username)}
            onChange={(event) => {
              setUsername(event.target.value);
              setErrors((previous) => ({ ...previous, username: null }));
            }}
          />
          {errors.username && <p className="text-sm text-destructive">{errors.username}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="settingsEmail">Email</Label>
          <Input
            id="settingsEmail"
            name="email"
            type="email"
            value={email}
            aria-invalid={Boolean(errors.email)}
            onChange={(event) => {
              setEmail(event.target.value);
              setErrors((previous) => ({ ...previous, email: null }));
            }}
          />
          {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
        </div>

        <Button type="submit" disabled={loading || unchanged}>
          {loading ? "Saving..." : "Save changes"}
        </Button>
      </form>
    </section>
  );
}

function PasswordForm({ logIn }: { logIn: LogIn }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  const [changePassword, { loading }] = useMutation(CHANGE_PASSWORD);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const invalid = passwordError(next);
    if (invalid) {
      setProblem(invalid);
      return;
    }
    if (next !== confirm) {
      setProblem("The two new passwords do not match.");
      return;
    }
    setProblem(null);

    try {
      const { data } = await changePassword({
        variables: { currentPassword: current, newPassword: next },
      });
      const result = data as { changePassword: { token: string } };
      logIn(result.changePassword.token);
      setCurrent("");
      setNext("");
      setConfirm("");
      toast.success("Your password was changed");
    } catch (error) {
      const message = requestErrorMessage(error);
      setProblem(message);
      toast.error(message);
    }
  };

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <h2 className="font-medium">Password</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        At least {MIN_PASSWORD_LENGTH} characters. You stay signed in on this device.
      </p>

      <form className="mt-4 space-y-4" onSubmit={handleSubmit} noValidate>
        <div className="space-y-2">
          <Label htmlFor="currentPassword">Current password</Label>
          <PasswordInput
            id="currentPassword"
            name="currentPassword"
            autoComplete="current-password"
            visible={visible}
            onToggleVisible={() => setVisible((shown) => !shown)}
            invalid={false}
            describedBy={undefined}
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="newPassword">New password</Label>
          <PasswordInput
            id="newPassword"
            name="newPassword"
            autoComplete="new-password"
            visible={visible}
            onToggleVisible={() => setVisible((shown) => !shown)}
            invalid={Boolean(problem)}
            describedBy={problem ? "passwordProblem" : undefined}
            value={next}
            onChange={(event) => setNext(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            autoComplete="new-password"
            visible={visible}
            onToggleVisible={() => setVisible((shown) => !shown)}
            invalid={Boolean(problem)}
            describedBy={problem ? "passwordProblem" : undefined}
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
          />
        </div>

        {problem && (
          <p id="passwordProblem" role="alert" className="text-sm text-destructive">
            {problem}
          </p>
        )}

        <Button type="submit" disabled={loading || !current || !next || !confirm}>
          {loading ? "Changing..." : "Change password"}
        </Button>
      </form>
    </section>
  );
}

function SettingsSkeleton() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Skeleton className="h-16 w-64" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-72 w-full" />
    </div>
  );
}
