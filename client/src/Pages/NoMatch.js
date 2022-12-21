import React from 'react';

// ** CATCH PAGE FOR INVALID QUERY ** //
const NoMatch = () => {
  return (
    
    <div className=" flex flex-col items-center errorhandling mx-auto w-1/2 animate-pulse -px-4 break-all">
      Oops, we couldn't find that page.
    </div>
  
  );
};

export default NoMatch;