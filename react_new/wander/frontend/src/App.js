import './App.css';
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import SignupOrLogin from "./pages/SignupOrLogin"
import LocationPermission from "./pages/LocationPermission";
import GoogleMaps from "./pages/GoogleMaps";
import InformationDisplay from "./pages/InformationDisplay";
import FeedbackForm from "./pages/FeedbackForm";
import Registration from "./pages/registrationpage";
import LandingPage from './pages/landing';
import Navbar from './pages/Navbar';

function App() {
  return (
    <>
      <Navbar />
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<SignupOrLogin />} />
          <Route path="/location-permission" element={<LocationPermission />} />
          <Route path="/register" element={<Registration />} />
          <Route path="/google-maps" element={<GoogleMaps />} />
          <Route path="/information-display" element={<InformationDisplay />} />
          <Route path="/feedback-form" element={<FeedbackForm />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;