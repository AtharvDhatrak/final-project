import React, { useEffect, useState, useRef } from 'react';
import Cookies from 'js-cookie';
import axios from 'axios';
import '../styles/information_display.css';
import { MapContainer, TileLayer, Marker, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';
import { useNavigate } from 'react-router-dom';

// Fix marker icons for Leaflet (essential for React-Leaflet)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Custom user icon
const userIcon = new L.Icon({
  iconUrl: require('./placeholder.png'), // Ensure this path is correct
  iconSize: [30, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Haversine distance in km
const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371; // Earth radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

const InformationDisplay = () => {
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState(null);

  const mapRef = useRef(null); // Creating a reference for the map
  const navigate = useNavigate(); // Initialize useNavigate hook

  // --- MODIFIED useEffect for precise location ---
  useEffect(() => {
    // Try to get high-accuracy location first
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLat = position.coords.latitude;
          const newLng = position.coords.longitude;
          setLatitude(newLat);
          setLongitude(newLng);
          setLoading(false);
          // Optionally, save the precise location to cookies for future visits
          Cookies.set('latitude', newLat.toString(), { expires: 7 });
          Cookies.set('longitude', newLng.toString(), { expires: 7 });
          console.log("Precise location obtained from Geolocation API.");
        },
        (geoError) => {
          console.warn("Geolocation failed:", geoError);
          setError(`Geolocation error: ${geoError.message}. Attempting to use saved location.`);
          // Fallback to cookies if geolocation fails or is denied
          const lat = Cookies.get('latitude');
          const lng = Cookies.get('longitude');
          if (lat && lng) {
            setLatitude(parseFloat(lat));
            setLongitude(parseFloat(lng));
            setError(null); // Clear error if cookie data is found
            console.log("Using location from cookies as fallback.");
          } else {
            setError("Location data not available. Please enable location services or grant location permission.");
          }
          setLoading(false);
        },
        {
          enableHighAccuracy: true, // Request the most accurate position
          timeout: 10000,           // Wait up to 10 seconds for a position
          maximumAge: 0             // Don't use cached positions
        }
      );
    } else {
      // Fallback if browser does not support Geolocation
      setError("Geolocation not supported by your browser. Attempting to use saved location.");
      const lat = Cookies.get('latitude');
      const lng = Cookies.get('longitude');
      if (lat && lng) {
        setLatitude(parseFloat(lat));
        setLongitude(parseFloat(lng));
        setError(null); // Clear error if cookie data is found
        console.log("Using location from cookies as fallback.");
      } else {
        setError("Location data not available. Please enable location services or grant location permission.");
      }
      setLoading(false);
    }
  }, []); // Empty dependency array means this runs once on component mount

  const fetchUserResponse = async () => {
    setFetchLoading(true);
    setError(null);
    try {
      const userId = Cookies.get('userId');
      console.log(Cookies.get('userId'))
      if (!userId) {
        setError("User ID not found. Please log in again.");
        return;
      }

      const response = await axios.get(
        `http://localhost:5000/give_user_response_api?latitude=${latitude}&longitude=${longitude}`,
        { method: 'GET', credentials: 'include' }
      );
      setResponse(response.data);
      console.log(response.data)
    } catch (error) {
      setError(`Failed to fetch user response: ${error.message}`);
      setResponse(null);
    } finally {
      setFetchLoading(false);
      // setLoading(false); // No need to set loading to false here, as it's controlled by initial geo-location fetch
    }
  };

  useEffect(() => {
    // This useEffect needs to trigger after location (latitude, longitude) is available
    // and after the response from the backend is received.
    if (latitude !== null && longitude !== null && response && response.length > 0) {
      const map = mapRef.current;
      if (map && map.leafletElement) { // Ensure map instance exists and is initialized
        const leafletMap = map.leafletElement;

        // Clear existing routes before adding a new one
        leafletMap.eachLayer((layer) => {
          if (layer instanceof L.Routing.Control) {
            leafletMap.removeControl(layer);
          }
        });

        const waypoints = response.slice(0, 5).map(item => L.latLng(item.latitude, item.longitude));
        const userLocation = L.latLng(latitude, longitude);

        // Create the routing control and add the route to the map
        L.Routing.control({
          waypoints: [userLocation, ...waypoints],
          createMarker: () => null, // Prevent markers from being added to each waypoint
          routeWhileDragging: true, // Allow route to update while dragging (can be resource-intensive)
          lineOptions: {
            styles: [{ color: 'blue', opacity: 0.6, weight: 6 }] // Style the route line
          },
          // You might want to hide the routing UI if you only need the path
          show: false, // Hides the routing UI (instructions, etc.)
          addWaypoints: false, // Prevents users from adding new waypoints
          draggableWaypoints: false, // Makes waypoints non-draggable
          fitSelectedRoutes: true // Adjust map view to fit the route
        }).addTo(leafletMap);
      }
    }
  }, [latitude, longitude, response]); // Dependencies for this useEffect

  // Function to handle card click and navigate
  const handleCardClick = (itemData) => {
    navigate('/monument-detail', { state: { monument: itemData } });
  };

  return (
    <div className='main_container'>
      <div className="container">
        <div className="info-container">
          <h2 className="heading">Location Information</h2>
          {loading ? (
            <p className="loading-text">Getting precise location...</p>
          ) : latitude !== null && longitude !== null ? (
            <p className="location-info">
              Latitude: {latitude.toFixed(6)}, Longitude: {longitude.toFixed(6)}
            </p>
          ) : (
            <p className="loading-text">Waiting for location data...</p>
          )}

          {!response && latitude !== null && longitude !== null && (
            <button onClick={fetchUserResponse} disabled={fetchLoading} className="fetch-button">
              {fetchLoading ? 'Fetching Response...' : 'Get User Response'}
            </button>
          )}
          {fetchLoading && <p className="loading-text">Loading user response...</p>}
          {error && <p className="error-text">{error}</p>}

          {response && response.length > 0 && (
            <div className="cards-container">
              {response.map((item, index) => {
                const to = [item.latitude, item.longitude];
                const from = [latitude, longitude];
                const dist = haversineDistance(...from, ...to).toFixed(2);
                return (
                  <div key={index} className="card" onClick={() => handleCardClick(item)}>
                    <h4 className="card-heading">{item.name}</h4>
                    <p><strong>Type:</strong> {item.type}</p>
                    <p><strong>City:</strong> {item.city}</p>
                    <p>{item.description}</p>
                    <p><strong>Coordinates:</strong> ({item.latitude}, {item.longitude})</p>
                    <p><strong>Distance:</strong> {dist} km</p>
                  </div>
                );
              })}
            </div>
          )}

          {!loading && !error && !response && latitude !== null && longitude !== null && (
            <p className="no-response-text">No response found after generation.</p>
          )}
        </div>
      </div>

      {latitude !== null && longitude !== null && ( // Render map only if user location is available
        <div className="map-wrapper">
          <MapContainer
            center={[latitude, longitude]}
            zoom={12}
            scrollWheelZoom={true} // Allow scroll wheel zoom for better user experience
            style={{ height: "100%", width: "100%", borderRadius: "12px" }}
            ref={mapRef}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />

            <Marker position={[latitude, longitude]} icon={userIcon}>
              <Popup>Your Location</Popup>
              <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                You are here
              </Tooltip>
            </Marker>

            {response && response.slice(0, 5).map((item, index) => { // Only show markers if response is available
              const to = [item.latitude, item.longitude];
              const dist = haversineDistance(latitude, longitude, item.latitude, item.longitude).toFixed(2);

              return (
                <Marker key={index} position={to}>
                  <Popup>{item.name}</Popup>
                  <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                    {item.name} <br /> Distance: {dist} km
                  </Tooltip>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      )}
    </div>
  );
};

export default InformationDisplay;