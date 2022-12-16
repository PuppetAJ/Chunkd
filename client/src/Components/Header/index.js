import React from "react";
import { Link } from "react-router-dom";
import Auth from "../../utils/auth";
import Logo from "../../assets/home-logo.jpg";


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
                            <div className='nav-wrapper flex place-content-between p-1 content-center border-b border-solid border-gray-800'>
                                {/* Nav list */}
                                <ul className='flex'>

                                    <a href="/"><img src={Logo} alt="Company Logo" className="w-16 mt-1 border-2 border-black rounded"></img>
                                            </a>

                                    <Link as={Link} className="m-3 w-24 btn-minecraft rounded p-2 duration-300 hover:scale-105" to='/Editor'>
                                                Editor
                                            </Link>
                                
                                
                                    <Link as={Link} className="m-3 w-24 btn-minecraft rounded p-2 duration-300 hover:scale-105" to='/Home'>
                                                Forum
                                            </Link>
                                
                                    
                                    <Link as={Link} className="m-3 w-32 btn-minecraft rounded p-2 duration-300 hover:scale-105" to='/Profile'>
                                                My Profile
                                            </Link>
                                
                                </ul>
							    <a className="m-3 btn-minecraft rounded p-2 w-24" href='/' onClick={logout}>
								Logout
							    </a>
                            </div>
						</>
					) : (
						<>
						
						<div className="justify-content-center">
							<Link to='/login' className="btn-minecraft rounded mr-7 relative -bottom-60" >Login</Link>
							<Link to='/signup' className="btn-minecraft rounded ml-7 relative -bottom-60">Signup</Link>
							</div>
						</>
					)}
				</nav>
			</div>
		</header>
	);
};

export default Header;
