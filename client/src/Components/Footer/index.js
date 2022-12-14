import * as React from 'react'
import { ButtonGroup, Container, IconButton, Stack, Text } from '@chakra-ui/react';
import { FaGithub, FaLinkedin, FaTwitter } from 'react-icons/fa';


const Footer = () => {

  //Return JSX
  return (
  //   <footer className="w-100 mt-auto bg-secondary p-4">
  //     <div className="container">
  //       &copy;{new Date().getFullYear()} Team NotHavinIt
  //     </div>
  //   </footer>
  // );



  <Container
  as="footer"
  role="contentinfo"
  py={{
    base: '12',
    md: '16',
  }}
>
  <Stack
    spacing={{
      base: '4',
      md: '5',
    }}
  >
    <Stack justify="space-between" direction="row" align="center">
      
      <ButtonGroup variant="ghost">
        <IconButton
          as="a"
          href="#"
          aria-label="LinkedIn"
          icon={<FaLinkedin fontSize="1.25rem" />}
        />
        <IconButton as="a" href="#" aria-label="GitHub" icon={<FaGithub fontSize="1.25rem" />} />
        <IconButton
          as="a"
          href="#"
          aria-label="Twitter"
          icon={<FaTwitter fontSize="1.25rem" />}
        />
      </ButtonGroup>
    </Stack>
    <Text fontSize="sm" color="subtle">
      &copy; {new Date().getFullYear()} Chakra UI Pro, Inc. All rights reserved.
    </Text>
  </Stack>
</Container>
)
};

export default Footer;




