import './App.css';
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import SignupOrLogin from "./pages/SignupOrLogin";
import LocationPermission from "./pages/LocationPermission";
import GoogleMaps from "./pages/GoogleMaps";
import InformationDisplay from "./pages/InformationDisplay";
import FeedbackForm from "./pages/FeedbackForm";
import Registration from "./pages/registrationpage";
import LandingPage from './pages/landing';
import Navbar from './pages/Navbar'; // Assuming Navbar is in 'pages' folder
import MonumentDetail from './pages/monumentDetail';
import Chatbot from './pages/chatbot';

function App() {
  return (
    <Router> {/* Router starts here */}
      <Navbar /> {/* Navbar is now inside the Router */}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<SignupOrLogin />} />
        <Route path="/location-permission" element={<LocationPermission />} />
        <Route path="/register" element={<Registration />} />
        <Route path="/google-maps" element={<GoogleMaps />} />
        <Route path="/information-display" element={<InformationDisplay />} />
        <Route path="/feedback-form" element={<FeedbackForm />} />
        <Route path="/monument-detail" element={<MonumentDetail />} />
        <Route path="/Chatbot" element={<Chatbot />} />
      </Routes>
    </Router> // Router ends here
  );
}

export default App;