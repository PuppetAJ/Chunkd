import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { useApolloClient } from "@apollo/client/react";
import { useMutation } from "@apollo/client/react";
import { ADD_USER } from "../utils/mutations.ts";
import { useAuthStore } from "../lib/auth.ts";
import {
	emailError,
	passwordError,
	requestErrorMessage,
	usernameError,
	MIN_PASSWORD_LENGTH,
} from "../lib/credentials.ts";
import homeLogo from "../assets/CHUNKD.png";

const Signup = () => {
	const logIn = useAuthStore((state) => state.logIn);
	const navigate = useNavigate();
	const apollo = useApolloClient();
	const [formState, setFormState] = useState({
		username: "",
		email: "",
		password: "",
	});

	// One message per field, plus one for whatever the server says. Previously
	// every failure rendered the same "Signup failed !", so a password that was
	// too short looked identical to an email that was already taken.
	const [fieldErrors, setFieldErrors] = useState({});
	const [submitError, setSubmitError] = useState("");

	const [addUser, { loading }] = useMutation(ADD_USER);

	const handleChange = (event) => {
		const { name, value } = event.target;
		setFormState({ ...formState, [name]: value });
		// Clear a field's complaint as soon as it is being edited, so the message
		// does not sit there contradicting what is on screen.
		setFieldErrors((previous) => ({ ...previous, [name]: null }));
		setSubmitError("");
	};

	const handleFormSubmit = async (event) => {
		event.preventDefault();
		setSubmitError("");

		const problems = {
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
			logIn(data.addUser.token);
			await apollo.resetStore();
			navigate("/", { replace: true });
		} catch (error) {
			setSubmitError(requestErrorMessage(error));
		}
	};

	const fieldClasses = (name) =>
		`border rounded px-3 py-1 pl-2 btn-minecraft ${
			fieldErrors[name] ? "border-red-400" : ""
		}`;

	return (
		<main id="login" className="flex-row grow justify-content-center container">
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
							className={fieldClasses("username")}
							placeholder="Your username"
							name="username"
							type="text"
							id="username"
							autoComplete="username"
							aria-invalid={Boolean(fieldErrors.username)}
							value={formState.username}
							onChange={handleChange}
						/>
						{fieldErrors.username && (
							<p className="text-xs text-red-400 mt-1">{fieldErrors.username}</p>
						)}
					</div>

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

					<div className="flex flex-col my-2">
						<input
							className={fieldClasses("password")}
							placeholder="Password"
							name="password"
							type="password"
							id="password"
							autoComplete="new-password"
							aria-invalid={Boolean(fieldErrors.password)}
							value={formState.password}
							onChange={handleChange}
						/>
						{fieldErrors.password ? (
							<p className="text-xs text-red-400 mt-1">{fieldErrors.password}</p>
						) : (
							<p className="text-xs text-gray-400 mt-1">
								At least {MIN_PASSWORD_LENGTH} characters.
							</p>
						)}
					</div>

					<div className="flex flex-col items-center justify-center my-3">
						<button
							type="submit"
							disabled={loading}
							className="btn-minecraft my-3 w-full border rounded disabled:opacity-60"
						>
							{loading ? "Creating account..." : "Submit"}
						</button>
						<p className="text-xs text-gray-400">
							Already have an account?{" "}
							<Link to="/login" className="underline">
								Log in
							</Link>
						</p>
					</div>
				</form>
			</div>
		</main>
	);
};

export default Signup;
