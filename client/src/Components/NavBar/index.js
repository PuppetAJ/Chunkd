
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
          <a name='builder' onClick = {navSelect} className='active' href="#Builder">Builder</a>
        </li>
        <li>
          <a name='forum' onClick = {navSelect} href="#Forum">Forum</a>
        </li>
        <li>
          <a name='profile' onClick = {navSelect} href="#Profile">Profile</a>
        </li>
        <li>
          <a name='login' onClick = {navSelect} href="#Login">Login</a>
        </li>
      </ul>
    </div>
  )
};

// Export component
export default NavBar;