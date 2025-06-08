import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie'; // Import js-cookie library

// Note: Removed axios import as it's not used in the provided code.
// import '../styles/login.css'; // Assuming this CSS file exists and styles the component

const SignupOrLogin = () => {
  const navigate = useNavigate();

  // State to manage form input
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });

  const [error, setError] = useState(''); // State to manage error messages

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Handle form submission (authentication)
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch('http://localhost:5000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json(); // Read response body once

      if (!response.ok) {
        // If response is not OK (e.g., 401, 400, 500 status codes)
        const errorMessage = data.message || 'Authentication failed. Please check your username and password.';
        console.error('Login error:', errorMessage); // Use console.error for errors
        setError(errorMessage);
        return; // Stop execution if there's an error
      }

      console.log('Login successful:', data);

      // --- START: Changed for client-side cookie storage ---
      // IMPORTANT SECURITY NOTE:
      // Setting sensitive data like userId directly in client-side cookies
      // is generally less secure than having the server set an HttpOnly cookie.
      // HttpOnly cookies prevent JavaScript access, reducing XSS attack vectors.
      // If userId is for authentication, prefer server-side HttpOnly cookies.
      Cookies.set('userId', data.userId, { expires: 7, secure: true, sameSite: 'Lax' }); // Sets a cookie named 'userId'
      // 'expires: 7' means the cookie will expire in 7 days.
      // 'secure: true' means the cookie will only be sent over HTTPS.
      // 'sameSite: 'Lax'' provides some protection against CSRF attacks.
      // --- END: Changed for client-side cookie storage ---

      console.log('User ID set in cookie:', data.userId);

      // Navigate to the next page after successful login and cookie setting
      navigate('/location-permission');

    } catch (err) {
      console.error('Error during login fetch operation:', err); // Log the full error object
      setError('A network error occurred. Please try again later.'); // More generic error message for network issues
    }
  };

  return (
    <div className="page-background">
      <div className="glass">
        <h1>Wanderlust</h1>
        {/* Display error message if present */}
        {error && (
          <p style={{ color: 'red', marginBottom: '15px', textAlign: 'center' }}>{error}</p>
        )}
        <p
          style={{ cursor: 'pointer', color: '#007bff', textDecoration: 'underline', marginBottom: '10px' }}
          onClick={() => navigate('/register')}
        >
          Continue to sign up for free
        </p>
        <p style={{ marginBottom: '20px' }}>If you already have an account, we'll log you in.</p>

        {/* Input Fields for Username and Password */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input
            type="text"
            name="username"
            placeholder="Username"
            value={formData.username}
            onChange={handleChange}
            style={{ padding: '12px', border: '1px solid #ccc', borderRadius: '8px', width: '100%' }}
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            style={{ padding: '12px', border: '1px solid #ccc', borderRadius: '8px', width: '100%' }}
            required
          />
          <button
            type="submit"
            style={{
              padding: '12px 20px',
              backgroundColor: '#28a745', // Green color
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              transition: 'background-color 0.3s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#218838'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#28a745'}
          >
            Log In
          </button>
        </form>
      </div>
    </div>
  );
};

export default SignupOrLogin;
