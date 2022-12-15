
// Imports
import React from 'react';


// Component initialization
function NavBar(props) {

  // Deconstruct props
  const {navSelect} = props;

  // JSX
  return (
    <div className='nav-wrapper'>
      {/* Nav list */}
      <ul>
        <li>
          <a name='editor' onClick = {navSelect} className='active' href="#editor">Editor</a>
        </li>
        <li>
          <a name='forum' onClick = {navSelect} href="#home">Forum</a>
        </li>
        <li>
          <a name='profile' onClick = {navSelect} href="#profile">Profile</a>
        </li>
        <li>
          <a name='login' onClick = {navSelect} href="#login">Login</a>
        </li>
      </ul>
    </div>
  )
};

// Export component
export default NavBar;