import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router";
import { useApolloClient } from "@apollo/client/react";
import { useMutation } from "@apollo/client/react";
import { LOGIN_USER } from "../utils/mutations.ts";
import homeLogo from "../assets/CHUNKD.png";

import { useAuthStore } from "../lib/auth.ts";
import { emailError, requestErrorMessage } from "../lib/credentials.ts";

const Login = () => {
	const logIn = useAuthStore((state) => state.logIn);
	const navigate = useNavigate();
	const location = useLocation();
	const apollo = useApolloClient();
	const [formState, setFormState] = useState({ email: "", password: "" });

	// The old form showed "Email & Password do not match!" for every failure,
	// including ones that had nothing to do with the password, and swallowed the
	// server's actual message into the console.
	const [fieldErrors, setFieldErrors] = useState({});
	const [submitError, setSubmitError] = useState("");

	const [login, { loading }] = useMutation(LOGIN_USER);

	const handleChange = (event) => {
		const { name, value } = event.target;
		setFormState({ ...formState, [name]: value });
		setFieldErrors((previous) => ({ ...previous, [name]: null }));
		setSubmitError("");
	};

	const handleFormSubmit = async (event) => {
		event.preventDefault();
		setSubmitError("");

		// Logging in does not re-check the password rules: an account made before
		// they changed still has to be able to get in.
		const problems = {
			email: emailError(formState.email),
			password: formState.password ? null : "Enter your password.",
		};
		setFieldErrors(problems);
		if (problems.email || problems.password) return;

		try {
			const { data } = await login({
				variables: { email: formState.email.trim(), password: formState.password },
			});

			logIn(data.login.token);
			// Drop anything cached for the logged-out visitor before showing the
			// signed-in view. The old code reloaded the whole page to achieve this.
			await apollo.resetStore();
			navigate(location.state?.from ?? "/", { replace: true });
		} catch (error) {
			setSubmitError(requestErrorMessage(error));
			// Keep the email so a wrong password does not mean retyping both.
			setFormState((previous) => ({ ...previous, password: "" }));
		}
	};

	const fieldClasses = (name) =>
		`border rounded px-3 py-1 btn-minecraft ${fieldErrors[name] ? "border-red-400" : ""}`;

	return (
		<main id="login" className="flex-row grow justify-center container">
			<div className="128">
				<img src={homeLogo} alt="logo" />
			</div>
			<div className="px-6 py-3 rounded w-64">
				<form onSubmit={handleFormSubmit} noValidate>
					{submitError && (
						<p role="alert" className="text-xs text-red-400 mb-2">
							{submitError}
						</p>
					)}

					<div className="flex flex-col my-2">
						<input
							className={fieldClasses("email")}
							placeholder="Your email"
							name="email"
							type="email"
							id="email"
							autoComplete="email"
							aria-invalid={Boolean(fieldErrors.email)}
							value={formState.email}
							onChange={handleChange}
						/>
						{fieldErrors.email && (
							<p className="text-xs text-red-400 mt-1">{fieldErrors.email}</p>
						)}
					</div>

					<div className="flex flex-col my-3">
						<input
							className={fieldClasses("password")}
							placeholder="Password"
							name="password"
							type="password"
							id="password"
							autoComplete="current-password"
							aria-invalid={Boolean(fieldErrors.password)}
							value={formState.password}
							onChange={handleChange}
						/>
						{fieldErrors.password && (
							<p className="text-xs text-red-400 mt-1">{fieldErrors.password}</p>
						)}
					</div>

					<div className="flex flex-col items-center justify-center my-3">
						<button
							type="submit"
							disabled={loading}
							className="btn-minecraft my-3 w-full border rounded disabled:opacity-60"
						>
							{loading ? "Logging in..." : "Submit"}
						</button>
						<p className="text-xs text-gray-400">
							Need an account?{" "}
							<Link to="/signup" className="underline">
								Sign up
							</Link>
						</p>
					</div>
				</form>
			</div>
		</main>
	);
};

export default Login;
