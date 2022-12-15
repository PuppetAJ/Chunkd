import React from 'react';
import { FaGithub} from 'react-icons/fa';


  const Footer = () => {
 
  //Return JSX
   return (

<footer className="footer footer-center w-full p-4 text-gray-800 ">
      <div className="text-center">
      <a className='duration-300 hover:scale-105' href="https://github.com/PuppetAJ/ReactMC">
            <FaGithub size= {48}/>
          </a>
        <p>
        &copy; {new Date().getFullYear()} Team NotHavinIt.
        </p>
      </div>
    </footer>

    )
 };

export default Footer;
