import React from "react";
import { Link } from "react-router-dom";
import Auth from "../../utils/auth";
import logo from "../../assets/Soul_Campfire.webp";

const Header = () => {
  const logout = (event) => {
    event.preventDefault();
    Auth.logout();
  };

  return (
    // this needs to be re-styled to show login/signup form //
    <header className="sticky top-0 z-50">
      <div>
        <Link to="/">{/* <h1>website</h1> */}</Link>


        <nav className="text-center bg-cover">
          {Auth.loggedIn() ? (
            <>
              <div className="relative nav-wrapper flex p-1 justify-center border-b border-solid border-gray-800">
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
							<div id="login-header"className="relative nav-wrapper flex p-1 justify-center border-b border-solid border-gray-800">
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
