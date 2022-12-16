
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
        
          <Link as={Link} className="p-2 duration-300 hover:scale-105" to='/Editor'>
                    Editor
                  </Link>
       
    
          <Link as={Link} className="p-2 duration-300 hover:scale-105" to='/Home'>
                    Forum
                  </Link>
       
        
          <Link as={Link} className="p-2 duration-300 hover:scale-105" to='/Profile'>
                    Profile
                  </Link>

          <Link as={Link}  className="p-2 duration-300 hover:scale-105" to='/Login'>
                    Login
                  </Link>
      
      </ul>
    </div>

    
  )
};

// Export component
export default NavBar;