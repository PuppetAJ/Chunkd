import React from 'react';
import Header from './components/Header'
import Footer from './components/Footer'
import 'bootstrap/dist/css/bootstrap.min.css'
import './App.css'
import Login from './components/Login';


function App() {
  return (
    <>
      <Header/>
      <Login/>
      <Footer/>
    </>
  );
}

export default App;
