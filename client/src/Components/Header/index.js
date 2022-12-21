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

  const [isNavOpen, setIsNavOpen] = useState(false);

  const clicked = () => {
    setModalOn(true);
  };

  return (
    // this needs to be re-styled to show login/signup form //
    <header className="header-format sticky top-0 z-50">
      <div>
        <nav className="text-center bg-cover">
          {Auth.loggedIn() ? (
            <>
              <div className=" nav-wrapper flex p-1 justify-center border-b border-solid border-gray-800">
                {/* Nav list */}
                <ul className="flex absolute left-0">
                  <section className="MOBILE-MENU flex lg:hidden mt-6">
                    <div
                      className="HAMBURGER-ICON space-y-2 ml-4"
                      onClick={() => setIsNavOpen((prev) => !prev)}
                    >
                      <span className="block h-0.5 w-8 bg-white"></span>
                      <span className="block h-0.5 w-8 bg-white"></span>
                      <span className="block h-0.5 w-8 bg-white"></span>
                    </div>

                    <div
                      className={
                        isNavOpen
                          ? "showMenuNav top-20 rounded border-2 border-black"
                          : "hideMenuNav"
                      }
                    >
                      <div
                        className="absolute top-2 px-8 "
                        onClick={() => setIsNavOpen(false)}
                      >
                        <svg
                          className="h-8 w-8 text-white"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </div>
                      <ul className="flex flex-col items-center justify-between my-16">
                        <li className="btn-minecraft rounded">
                          <a href="/Editor">Editor</a>
                        </li>
                        <li className="btn-minecraft rounded my-8">
                          <a href="/Profile">My Profile</a>
                        </li>
                      </ul>
                    </div>
                  </section>

                  <ul className="DESKTOP-MENU hidden space-x-8 lg:flex">
                    <Link
                      as={Link}
                      className="m-3 mt-4 w-24 btn-minecraft rounded p-2 duration-300 hover:scale-105"
                      to="/Editor"
                    >
                      Editor
                    </Link>
                    <Link
                      as={Link}
                      className="m-3 mt-4 w-32 btn-minecraft rounded p-2 duration-300 hover:scale-105"
                      to="/Profile"
                    >
                      My Profile
                    </Link>
                  </ul>
                  {/* button for modal click  */}
                  {location.pathname === "/Editor" && (
                    <button
                      onClick={clicked}
                      className="m-3 mt-4 w-32 btn-minecraft rounded p-2 duration-300 hover:scale-105"
                    >
                      Controls
                    </button>
                  )}
                  {/* <GameControlsModal /> */}
                  {modalOn && <GameControlsModal setModalOn={setModalOn} />}
                </ul>

                <a
                  href="/"
                  id="logo"
                  className="w-16 shrink place-self-center mb-3"
                >
                  <img src={logo} alt="Website Logo"></img>
                </a>

                <a
                  className="absolute shrink right-0 m-3 mt-4 btn-minecraft rounded p-2 w-24 duration-300 hover:scale-105"
                  href="/"
                  onClick={logout}
                >
                  Logout
                </a>
              </div>
            </>
          ) : (
            <>
              <div
                id="login-header"
                className="relative nav-wrapper flex p-1 justify-center border-b border-solid border-gray-800"
              >
                <Link to="/login" className="btn-minecraft rounded mr-7">
                  Login
                </Link>
                <Link to="/signup" className="btn-minecraft rounded ml-7">
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
