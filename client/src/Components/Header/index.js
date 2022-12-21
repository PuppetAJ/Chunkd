import { React, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Auth from "../../utils/auth";
import logo from "../../assets/Soul_Campfire.webp";
import GameControlsModal from "../GameControls";

const Header = () => {
	
	const logout = (event) => {
		event.preventDefault();
		Auth.logout();
	};

	const location = useLocation();

	//Logic for Modal
	const [modalOn, setModalOn] = useState(false);

	const clicked = () => {
		setModalOn(true)
	}


	return (
		// this needs to be re-styled to show login/signup form //
		<header className="sticky top-0 z-50">
			<div>
				

				<nav className="text-center bg-cover">
					{Auth.loggedIn() ? (
						<>
							<div className=" nav-wrapper flex p-1 justify-center border-b border-solid border-gray-800">
								{/* Nav list */}
								<ul className="flex absolute left-0">
									<Link
										as={Link}
										className="m-3 w-24 btn-minecraft rounded p-2 duration-300 hover:scale-105"
										to="/Editor"
									>
										Editor
									</Link>


									<Link
										as={Link}
										className="m-3 w-32 btn-minecraft rounded p-2 duration-300 hover:scale-105"
										to="/Profile"
									>
										My Profile
									</Link>

									{/* button for modal click  */}
									{location.pathname ==="/Editor" &&
										<button onClick={clicked} className="m-3 w-32 btn-minecraft rounded p-2 duration-300 hover:scale-105">
											Controls
										</button>}
									{/* <GameControlsModal /> */}
									{modalOn && < GameControlsModal setModalOn={setModalOn} />}

								</ul>




								<a href='/' id="logo" className="w-16 shrink place-self-center mb-3">
									<img src={logo} alt="Website Logo"></img>

								</a>

								<a
									className="absolute shrink right-0 m-3 btn-minecraft rounded p-2 w-24 duration-300 hover:scale-105"
									href='/'
									onClick={logout}
								>
									Logout
								</a>
							</div>
						</>
					) : (
						<>
							<div id="login-header" className="relative nav-wrapper flex p-1 justify-center border-b border-solid border-gray-800">
								<Link
									to='/login'
									className="btn-minecraft rounded mr-7"
								>
									Login
								</Link>
								<Link
									to='/signup'
									className="btn-minecraft rounded ml-7"
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
