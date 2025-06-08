import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';
import '../styles/location_permission.css';
import axios from 'axios';

const LocationPermission = () => {
  const [location, setLocation] = useState({ lat: null, lng: null });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [userId, setUserId] = useState(null); // Initialize userId state
  const navigate = useNavigate();

  // Retrieve userId from cookies or local storage on component mount
  useEffect(() => {
    const storedUserId = localStorage.getItem('userId') || Cookies.get('userId');
    if (storedUserId) {
      setUserId(storedUserId); // Set userId from storage
    } else {
      console.warn('User ID not found. Redirecting to login...');
      navigate('/login'); // Redirect to login if no userId found
    }
  }, [navigate]); // Added navigate as a dependency to ensure proper redirection

  // Save location to the database
  const saveLocationToDatabase = async (latitude, longitude) => {
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:5000/save_location', {
        userId: userId, // Use userId here
        latitude: latitude,
        longitude: longitude,
      });

      if (response.status !== 200) {
        let errorMessage = `Failed to save location: ${response.status}`;
        try {
          const errorData = response.data;
          errorMessage += ` - ${errorData.message || response.statusText}`;
        } catch (err) {
          console.error('Error parsing JSON error:', err);
          errorMessage += ` - ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      console.log('Location saved successfully');
      navigate('/information-display', { state: { latitude, longitude } });

    } catch (error) {
      setErrorMessage(error.message);
      console.error('Error saving location:', error);
    } finally {
      setLoading(false);
    }
  };

  const enableLocation = () => {
    if (!userId) {
      setErrorMessage("User ID not found. Please log in.");
      return;
    }

    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;

          setLocation({ lat: latitude, lng: longitude });
          setErrorMessage('');

          try {
            Cookies.set('latitude', latitude.toString(), { expires: 7, path: '/' });
            Cookies.set('longitude', longitude.toString(), { expires: 7, path: '/' });
            Cookies.set('user_id',userId,{ expires: 7, path: '/' });
            // Call the function to save location to the database
            saveLocationToDatabase(latitude, longitude);

          } catch (error) {
            setErrorMessage('Error saving location data');
            console.error('Error:', error);
          } finally {
            setLoading(false);
          }
        },
        (error) => {
          setLoading(false);
          handleGeolocationError(error);
        }
      );
    } else {
      setErrorMessage("Geolocation is not supported by your browser.");
    }
  };

  const handleGeolocationError = (error) => {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        setErrorMessage("User denied the request for Geolocation.");
        break;
      case error.POSITION_UNAVAILABLE:
        setErrorMessage("Location information is unavailable.");
        break;
      case error.TIMEOUT:
        setErrorMessage("The request to get user location timed out.");
        break;
      case error.UNKNOWN_ERROR:
        setErrorMessage("An unknown error occurred.");
        break;
      default:
        setErrorMessage("An error occurred while fetching location.");
    }
  };

  return (
    <div className="page-background">
      <div className="glass">
        <h2>Location Required</h2>
        <p>We use your location to provide you with the best experience. Your location is never shared publicly.</p>
        <button className="enable-button" onClick={enableLocation} disabled={loading}>
          {loading ? 'Fetching Location...' : 'Enable Location Services'}
        </button>
      </div>

      <div className="glass">
        {location.lat !== null && location.lng !== null ? (
          <>
            <p><strong>Latitude:</strong> {location.lat.toFixed(6)}</p>
            <p><strong>Longitude:</strong> {location.lng.toFixed(6)}</p>
          </>
        ) : (
          <p>Location not yet determined.</p>
        )}
      </div>

      {errorMessage && <p className="error-message">{errorMessage}</p>}
    </div>
  );
};

export default LocationPermission;
