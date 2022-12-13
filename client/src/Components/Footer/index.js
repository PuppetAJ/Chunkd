import React from 'react';

const Footer = () => {

  //Return JSX
  return (
    <footer className="w-100 mt-auto bg-secondary p-4">
      <div className="container">
        &copy;{new Date().getFullYear()} Team NotHavinIt
      </div>
    </footer>
  );
};

export default Footer;
