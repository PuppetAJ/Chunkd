import React from "react";
import { Link } from "react-router-dom";
import Auth from "../../utils/auth";

const Header = () => {
	const logout = (event) => {
		event.preventDefault();
		Auth.logout();
	};

	return (

		// this needs to be re-styled to show login/signup form //
		<header >
			<div>
				<Link to='/'>
					{/* <h1>website</h1> */}
				</Link>

				<nav className='text-center'>
					{Auth.loggedIn() ? (
						<>
							<Link to='/profile'>Profile</Link>
							<a href='/' onClick={logout}>
								Logout
							</a>
						</>
					) : (
						<>
						{/* Padding for these buttons needs to be changed These are buttons that display on landing page */}
						<div className="justify-content-center">
							<Link to='/login' className="btn-minecraft" >Login</Link>
							<Link to='/signup' className="btn-minecraft">Signup</Link>
							</div>
						</>
					)}
				</nav>
			</div>
		</header>
	);
};

export default Header;
