import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/landing.css"; // Import external CSS

const LandingPage = () => {
  const navigate = useNavigate();

  const handleExploreClick = () => {
    navigate("/login");
  };

  return (
    <div className="landing-page">
      <h1>Wanderlust.ai</h1>
      <p>Your smart travel companion—discover the best destinations based on your location and preferences.</p>
      <button className="explore-btn" onClick={handleExploreClick}>
        Explore Now
      </button>
    </div>
  );
};

export default LandingPage;
