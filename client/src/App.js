<<<<<<< HEAD
// import React from "react";
import { Canvas } from "@react-three/fiber";
import { Sky } from "@react-three/drei";
// import logo from './logo.svg';
import "./App.css";
||||||| 500b21d
import React from 'react';
import logo from './logo.svg';
import './App.css';
=======
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ApolloProvider, ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import Home from './Pages/Home';
import Editor from './Pages/Editor';
>>>>>>> 23e7a82ab41169a78bbd1c421e28e0b849aa4e5d

<<<<<<< HEAD
function App(props) {
	return (
		<>
			{/* <div>Outside Canvas</div> */}
			<Canvas>
				<Sky
					distance={450000}
					sunPosition={[5, 1, 8]}
					inclination={0}
					azimuth={0.25}
					{...props}
				/>
			</Canvas>
		</>
	);
||||||| 500b21d
function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
=======
const httpLink = createHttpLink({
  uri: '/graphql',
});

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('id_token');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    }
  };
});

const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});

// Add catch route all later
function App() {
  return (
    <ApolloProvider client={client}>
      <Router>
        <Routes>
          <Route 
            path='/' 
            element={<Home/>} 
          />
          <Route 
            path='/editor' 
            element={<Editor/>} 
          />
        </Routes>
      </Router>
    </ApolloProvider>
  );
>>>>>>> 23e7a82ab41169a78bbd1c421e28e0b849aa4e5d
}

export default App;
