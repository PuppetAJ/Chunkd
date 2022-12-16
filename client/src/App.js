import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import {
	ApolloProvider,
	ApolloClient,
	InMemoryCache,
	createHttpLink,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import Header from "./Components/Header";
import Footer from "./Components/Footer";
import Login from "./Pages/Login";
import NoMatch from "./Pages/NoMatch";
import SingleThought from "./Pages/SingleThought";
import Profile from "./Pages/Profile";
import Signup from "./Pages/Signup";
import Home from "./Pages/Home";
import Editor from "./Pages/Editor";
import NavBar from "./Components/NavBar";

const httpLink = createHttpLink({
	uri: "/graphql",
});

const authLink = setContext((_, { headers }) => {
	const token = localStorage.getItem("id_token");
	return {
		headers: {
			...headers,
			authorization: token ? `Bearer ${token}` : "",
		},
	};
});

const client = new ApolloClient({
	link: authLink.concat(httpLink),
	cache: new InMemoryCache(),
});

// Add catch route all later
// https://reactrouter.com/en/main/hooks/use-location
// USE LOCATION ^^
function App() {
	return (
		<ApolloProvider client={client}>
			<Router>
				{/* <div className='flex-column justify-flex-start min-100-vh'> */}
				<Header />

				<Routes>
					<Route path='/' element={<Home />} />
					<Route path='/editor' element={<Editor />} />
					<Route path='/login' element={<Login />} />
					<Route path='/signup' element={<Signup />} />
					<Route path='/profile'>
						<Route path=":username" element={<Profile />} />
						<Route path="" element={<Profile />} />
					</Route>
					<Route path='/thought/:id' element={<SingleThought />} />
					<Route path='*' element={<NoMatch />} />
				</Routes>

				{/* <Footer/> */}
				{/* </div> */}
			</Router>
		</ApolloProvider>
	);
}

export default App;
