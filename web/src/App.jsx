import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

import Navbar from './components/Navbar'
import RegisterScreen from './screens/RegisterScreen/RegisterScreen'
import LoginScreen from './screens/LoginScreen/LoginScreen'
import HomeScreen from './screens/HomeScreen/HomeScreen'

function App() {
  const accessToken = localStorage.getItem("accessToken");
  if (accessToken) {
    console.log("User token found:", accessToken);
  } else {
    console.log("No user token found.");
  }
  return (
    <Router>
      <Navbar />
      <Routes>
        {accessToken ? (
          <Route path="/home" element={<HomeScreen />} />
        ) : (
          <>
            <Route path="/register" element={<RegisterScreen />} />
            <Route path="/login" element={<LoginScreen />} />
          </>
        )}
      </Routes>
    </Router>
  )
}

export default App
