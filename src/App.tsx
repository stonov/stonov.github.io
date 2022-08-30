import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import logo from './logo.svg';
import './App.css';

import Home from "./pages/Home"
import ReactDefault from "./pages/ReactDefault"

function App() {
  return (
    <Router>
        <Routes>
            <Route path="/" element={<Home/>}/>
            <Route path="/react-default" element={<ReactDefault/>}/>
        </Routes>
    </Router>
  );
}

export default App;
