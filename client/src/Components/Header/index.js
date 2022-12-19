import React from "react";
import { Link } from "react-router-dom";
import Auth from "../../utils/auth";
import logo from "../../assets/animated.webp";


const Header = () => {
	const logout = (event) => {
		event.preventDefault();
		Auth.logout();
	};

	return (
		// this needs to be re-styled to show login/signup form //
		<header className="sticky top-0">
			<div>
				<Link to='/'>{/* <h1>website</h1> */}</Link>

				<nav className='text-center'>
					{Auth.loggedIn() ? (
						<>
							<div className='relative nav-wrapper flex p-1 justify-center border-b border-solid border-gray-800'>
								{/* Nav list */}
								<ul className='flex absolute left-0'>
									<Link
										as={Link}
										className="m-3 w-24 btn-minecraft rounded p-2 duration-300 hover:scale-105"
										to='/Editor'
									>
										Editor
									</Link>

									<Link
										as={Link}
										className="m-3 w-32 btn-minecraft rounded p-2 duration-300 hover:scale-105"
										to='/Profile'
									>
										My Profile
									</Link>
								</ul>

								<a href='/' className="w-16 place-self-center">
									<img src={logo}></img>
								</a>

								<a
									className="absolute right-0 m-3 btn-minecraft rounded p-2 w-24 duration-300 hover:scale-105"
									href='/'
									onClick={logout}
								>
									Logout
								</a>
							</div>
						</>
					) : (
						<>
							<div className="justify-center mt-10">
								<Link
									to='/login'
									className="btn-minecraft rounded mr-7 -bottom-60"
								>
									Login
								</Link>
								<Link
									to='/signup'
									className="btn-minecraft rounded ml-7  -bottom-60"
								>
									Signup
								</Link>

							</div>
						</>
					)}
				</nav>
			</div>
		</header>
	);
};

export default Header;
