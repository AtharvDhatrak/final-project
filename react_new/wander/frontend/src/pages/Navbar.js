import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie'; // Import js-cookie
import '../styles/navbar.css'; // Import external CSS

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false); // New state for login status

  useEffect(() => {
    // Check for a login-related cookie when the component mounts
    const userId = Cookies.get('userId'); // Or whatever cookie indicates a logged-in user
    if (userId) {
      setIsLoggedIn(true);
    } else {
      setIsLoggedIn(false);
    }

    // You might also want to listen for changes to the cookie if login/logout
    // happens without a full page reload. This often involves a custom event
    // or a more robust state management solution (like React Context or Redux).
    // For simplicity here, we're assuming a page reload or initial check.
  }, []); // Run once on component mount

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-logo">WanderLust.Ai</div>
        <ul className={`navbar-links ${isOpen ? 'active' : ''}`}>
          <li><a href="/">Home</a></li>
          <li><a href="">About</a></li>
          <li><a href="/login">Login</a></li>
          {/* {isLoggedIn && ( // Conditionally render based on isLoggedIn state
            <li><a href="/add-place">Add a place</a></li>
          )} */}
        </ul>
        <div className="navbar-toggle" onClick={() => setIsOpen(!isOpen)}>
          <span className="bar"></span>
          <span className="bar"></span>
          <span className="bar"></span>
        </div>
      </div>
    </nav>
  );
}