import React, { useState } from "react";
import { useMutation } from "@apollo/client";
import { LOGIN_USER } from "../utils/mutations";

import Auth from "../utils/auth";
// import Footer from "../Components/Footer";


const Login = (props) => {
	const [formState, setFormState] = useState({ email: "", password: "" });
	const [login, { error }] = useMutation(LOGIN_USER);

	// update state based on form input changes
	const handleChange = (event) => {
		const { name, value } = event.target;

		setFormState({
			...formState,
			[name]: value,
		});
	};

	// submit form
	const handleFormSubmit = async (event) => {
		event.preventDefault();

		try {
			const { data } = await login({
				variables: { ...formState },
			});

			Auth.login(data.login.token);
		} catch (e) {
			console.error(e);
		}

		// clear form values
		setFormState({
			email: "",
			password: "",
		});
	};

	//Returning JSX
	return (
		<main id="login" className="flex-row grow justify-content-center container">

			

    <div className="px-6 py-3 rounded w-64">
        <div className="flex flex-col items-center justify-center mb-4">
        </div>
		<form onSubmit={handleFormSubmit}>
            <div className="flex flex-col my-2">
				{error &&  <div className="text-xs text-red-400 flex justify-between items-center"><span>
                    <b>Error: </b>
                   Email & Password do not match!
                    </span>
               
                    
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>}

				<input
								className="border rounded px-3 py-1 btn-minecraft"
								placeholder="Your email"
								name="email"
								type="email"
								id="email"
								value={formState.email}
								onChange={handleChange}
							/>
               
            </div>
            <div className="flex flex-col my-3">
				<input
								className="border rounded px-3 py-1 btn-minecraft"
								placeholder="Password"
								name="password"
								type="password"
								id="password"
								value={formState.password}
								onChange={handleChange}
							/>
            </div>
            <div className="flex flex-col items-center justify-center my-3">
                <button className="btn-minecraft my-3 w-full border rounded">
                    Submit
                </button>
               
            </div>
        </form>
		
    </div>
	
		</main>
	);
};

export default Login;



