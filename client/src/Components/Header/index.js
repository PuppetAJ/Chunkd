import React from 'react';
import {Link} from 'react-router-dom';
import Auth from '../../utils/auth';


const Header = () => {
//function to handle logout 
const logout = event => {
  //preventDefault overrides <a> default nature of loading a different resource
  event.preventDefault();
  Auth.logout();
}

  return (
    <header className="bg-secondary mb-4 py-2 flex-row align-center">
      <div className="container flex-row justify-space-between-lg justify-center align-center">
        <Link to='/'>
        <h1>NetherCraft</h1>
        </Link>

        <nav className='text-center'>
          {/* Set up links to conditionally render based on whether user is logged in or not */}
          {Auth.loggedIn() ? (
            <>
            <Link to='/profile'>Me</Link>
            {/* On click of Logout link, Logout function will execute */}
            <a href='/' onClick={logout}>
              Logout
            </a>
            </>
          ) : (
            <>
            <Link to='/login'>Login</Link>
            <Link to='/signup'>Signup</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
