import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie'; // Import js-cookie
import { useNavigate } from 'react-router-dom'; // Import useNavigate for redirection
import '../styles/navbar.css'; // Import external CSS

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false); // State for login status
  const navigate = useNavigate(); // Initialize navigate hook

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

  const handleLogout = () => {
    // Remove the userId cookie (or any other login-related cookies)
    Cookies.remove('userId');
    // Update the login status
    setIsLoggedIn(false);
    // Redirect to the home page or login page
    navigate('/'); // Redirect to the home page
    setIsOpen(false); // Close the mobile menu after logout
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-logo">WanderLust.Ai</div>
        <ul className={`navbar-links ${isOpen ? 'active' : ''}`}>
          <li><a href="/">Home</a></li>
          <li><a href="/information-display">Discover Places</a></li> {/* Added a link for information display */}
          <li><a href="/about">About</a></li> {/* Placeholder for an About page */}

          {isLoggedIn ? (
            // If logged in, show Logout button
            <li>
              <button onClick={handleLogout} className="navbar-logout-btn">
                Logout
              </button>
            </li>
          ) : (
            // If not logged in, show Login link
            <li><a href="/login">Login</a></li>
          )}
          {/* You can uncomment this if you want an "Add a place" link visible only when logged in */}
          {/* {isLoggedIn && (
            <li><a href="/add-place">Add a place</a></li>
          )} */}
        </ul>
        <div className="navbar-toggle" onClick={() => setIsOpen(!isOpen)}>
          <span className="bar">|</span>
          <span className="bar">|</span>
          <span className="bar">|</span>
        </div>
      </div>
    </nav>
  );
}