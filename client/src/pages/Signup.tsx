import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useApolloClient, useMutation } from "@apollo/client/react";

import { ADD_USER } from "../utils/mutations.ts";
import { useAuthStore } from "../lib/auth.ts";
import {
  emailError,
  passwordError,
  requestErrorMessage,
  usernameError,
  MIN_PASSWORD_LENGTH,
} from "../lib/credentials.ts";
import { AuthShell, PasswordInput } from "./Login.tsx";
import DemoLoginButton from "../components/DemoLoginButton.tsx";
import { Button } from "../components/ui/button.tsx";
import { Input } from "../components/ui/input.tsx";
import { Label } from "../components/ui/label.tsx";

interface FieldErrors {
  username?: string | null;
  email?: string | null;
  password?: string | null;
}

export default function Signup() {
  const logIn = useAuthStore((state) => state.logIn);
  const navigate = useNavigate();
  const apollo = useApolloClient();

  const [formState, setFormState] = useState({ username: "", email: "", password: "" });

  // One message per field, plus one for whatever the server says. Previously
  // every failure rendered the same "Signup failed !", so a password that was
  // too short looked identical to an email that was already taken.
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [addUser, { loading }] = useMutation(ADD_USER);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormState((previous) => ({ ...previous, [name]: value }));
    // Clear a field's complaint as soon as it is being edited, so the message
    // does not sit there contradicting what is on screen.
    setFieldErrors((previous) => ({ ...previous, [name]: null }));
    setSubmitError("");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError("");

    const problems: FieldErrors = {
      username: usernameError(formState.username),
      email: emailError(formState.email),
      password: passwordError(formState.password),
    };
    setFieldErrors(problems);
    if (problems.username || problems.email || problems.password) return;

    try {
      const { data } = await addUser({
        variables: {
          username: formState.username.trim(),
          email: formState.email.trim(),
          password: formState.password,
        },
      });
      logIn((data as { addUser: { token: string } }).addUser.token);
      await apollo.resetStore();
      navigate("/", { replace: true });
    } catch (error) {
      setSubmitError(requestErrorMessage(error));
    }
  };

  return (
    <AuthShell
      title="Make an account"
      subtitle="Build a world and share it. This is a portfolio site, so everything resets every few hours."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="text-primary underline underline-offset-2">
            Log in
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        {submitError && (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {submitError}
          </p>
        )}

        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            aria-invalid={Boolean(fieldErrors.username)}
            aria-describedby={fieldErrors.username ? "usernameError" : undefined}
            value={formState.username}
            onChange={handleChange}
          />
          {fieldErrors.username && (
            <p id="usernameError" className="text-sm text-destructive">
              {fieldErrors.username}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "emailError" : undefined}
            value={formState.email}
            onChange={handleChange}
          />
          {fieldErrors.email && (
            <p id="emailError" className="text-sm text-destructive">
              {fieldErrors.email}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            visible={showPassword}
            onToggleVisible={() => setShowPassword((shown) => !shown)}
            invalid={Boolean(fieldErrors.password)}
            describedBy="passwordHint"
            value={formState.password}
            onChange={handleChange}
          />
          <p
            id="passwordHint"
            className={fieldErrors.password ? "text-sm text-destructive" : "text-sm text-muted-foreground"}
          >
            {fieldErrors.password ?? `At least ${MIN_PASSWORD_LENGTH} characters.`}
          </p>
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating account..." : "Create account"}
        </Button>
      </form>

      <DemoLoginButton />
    </AuthShell>
  );
}
