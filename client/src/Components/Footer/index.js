import React from 'react';
import { FaGithub} from 'react-icons/fa';


  const Footer = () => {
 
  //Return JSX
   return (

<footer className="flex justify-center footer footer-center w-full p-4 text-gray-300">
      <div className="align-items-center mr-2">
      <a className="duration-300 hover:scale-105" href="https://github.com/PuppetAJ/ReactMC">
            <FaGithub size= {32}/>
          </a>
          </div>
        <p className="text-center ml-2">
        &copy; {new Date().getFullYear()} The Second Breakfast Club
        </p>
     
    </footer>

    )
 };

export default Footer;
