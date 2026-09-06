import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useApolloClient, useMutation } from "@apollo/client/react";
import { Eye, EyeOff } from "lucide-react";

import { LOGIN_USER } from "../utils/mutations.ts";
import { useAuthStore } from "../lib/auth.ts";
import { emailError, requestErrorMessage } from "../lib/credentials.ts";
import { Button } from "../components/ui/button.tsx";
import { Input } from "../components/ui/input.tsx";
import { Label } from "../components/ui/label.tsx";
import logo from "../assets/Soul_Campfire.webp";

/** One message per field, so a wrong password never looks like a bad email. */
interface FieldErrors {
  email?: string | null;
  password?: string | null;
}

export default function Login() {
  const logIn = useAuthStore((state) => state.logIn);
  const navigate = useNavigate();
  const location = useLocation();
  const apollo = useApolloClient();

  const [formState, setFormState] = useState({ email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [login, { loading }] = useMutation(LOGIN_USER);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormState((previous) => ({ ...previous, [name]: value }));
    setFieldErrors((previous) => ({ ...previous, [name]: null }));
    setSubmitError("");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError("");

    // Logging in does not re-check the password rules: an account made before
    // they changed still has to be able to get in.
    const problems: FieldErrors = {
      email: emailError(formState.email),
      password: formState.password ? null : "Enter your password.",
    };
    setFieldErrors(problems);
    if (problems.email || problems.password) return;

    try {
      const { data } = await login({
        variables: { email: formState.email.trim(), password: formState.password },
      });

      logIn((data as { login: { token: string } }).login.token);
      // Drop anything cached for the logged-out visitor before showing the
      // signed-in view. The old code reloaded the whole page to achieve this.
      await apollo.resetStore();
      const from = (location.state as { from?: string } | null)?.from ?? "/";
      navigate(from, { replace: true });
    } catch (error) {
      setSubmitError(requestErrorMessage(error));
      // Keep the email so a wrong password does not mean retyping both.
      setFormState((previous) => ({ ...previous, password: "" }));
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to open your worlds."
      footer={
        <>
          Need an account?{" "}
          <Link to="/signup" className="text-primary underline underline-offset-2">
            Sign up
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
            autoComplete="current-password"
            visible={showPassword}
            onToggleVisible={() => setShowPassword((shown) => !shown)}
            invalid={Boolean(fieldErrors.password)}
            describedBy={fieldErrors.password ? "passwordError" : undefined}
            value={formState.password}
            onChange={handleChange}
          />
          {fieldErrors.password && (
            <p id="passwordError" className="text-sm text-destructive">
              {fieldErrors.password}
            </p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Logging in..." : "Log in"}
        </Button>
      </form>
    </AuthShell>
  );
}

/**
 * The card both auth pages sit in.
 *
 * Defined here and imported by Signup rather than given its own file: it is
 * layout for exactly two pages, and splitting it further would mean opening
 * three files to understand one screen.
 */
export function AuthShell({
  title,
  subtitle,
  footer,
  children,
}: {
  title: string;
  subtitle: string;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center py-8">
      <img src={logo} alt="" className="size-12" />
      <h1 className="mt-4 font-display text-2xl">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>

      <div className="mt-6 w-full rounded-xl border border-border bg-card p-6">{children}</div>

      <p className="mt-4 text-sm text-muted-foreground">{footer}</p>
    </div>
  );
}

/** A password field with a show/hide button, shared by both auth pages. */
export function PasswordInput({
  id,
  name,
  autoComplete,
  visible,
  onToggleVisible,
  invalid,
  describedBy,
  value,
  onChange,
}: {
  id: string;
  name: string;
  autoComplete: string;
  visible: boolean;
  onToggleVisible: () => void;
  invalid: boolean;
  describedBy: string | undefined;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        className="pr-9"
        aria-invalid={invalid}
        aria-describedby={describedBy}
        value={value}
        onChange={onChange}
      />
      <button
        type="button"
        onClick={onToggleVisible}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 flex w-9 items-center justify-center rounded-r-lg text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}
