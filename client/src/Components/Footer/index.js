import * as React from 'react'
import { ButtonGroup, Container, IconButton, Stack, Text } from '@chakra-ui/react';
import { FaGithub, FaLinkedin, FaTwitter } from 'react-icons/fa';

const Footer = () => {

  //Return JSX
  return (

    <div className="footer-container">
  <Container
  as="footer"
  role="contentinfo"
  py={{
    base: '2',
    md: '4',
  }}
>
  <Stack
    spacing={{
      base: '2',
      md: '2',
    }}
  >
  
    <Stack justify="center" direction="row" align="center">
      
      <ButtonGroup variant="ghost">
        {/* <IconButton
          as="a"
          href="#"
          aria-label="LinkedIn"
          icon={<FaLinkedin fontSize="1.25rem" />}
        /> */}
        <IconButton as="a" href="https://github.com/PuppetAJ/ReactMC"
         aria-label="GitHub" 
         target="_blank"
         rel="noreferer"
         icon={<FaGithub fontSize="1.25rem" />} />
        {/* <IconButton
          as="a"
          href="#"
          aria-label="Twitter"
          icon={<FaTwitter fontSize="1.25rem" />}
        /> */}
      </ButtonGroup>
    </Stack>
    <Text fontSize="sm" color="subtle" align="center">
      &copy; {new Date().getFullYear()} Team NotHavinIt.
    </Text>
  </Stack>
</Container>
</div>


)
};

export default Footer;




