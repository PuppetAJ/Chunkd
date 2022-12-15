
// Imports
import React from 'react';
import {Link} from 'react-router-dom';



// Component initialization
function NavBar () {

 // set modal display state
//  const [showModal, setShowModal] = useState(false);

  // JSX
  return (
    <div className='nav-wrapper'>
      {/* Nav list */}
      <ul>
        
          <Link as={Link} to='/Editor'>
                    Editor
                  </Link>
       
    
          <Link as={Link} to='/Home'>
                    Forum
                  </Link>
       
        
          <Link as={Link} to='/Profile'>
                    Profile
                  </Link>
      <Link as={Link} to='/Login'>
                    Login
                  </Link>
      
      </ul>
    </div>

    
  )
};

// Export component
export default NavBar;