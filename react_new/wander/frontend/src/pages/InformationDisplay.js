import React, { useEffect, useState, useRef } from 'react';
import Cookies from 'js-cookie';
import axios from 'axios';
import '../styles/information_display.css';
import { MapContainer, TileLayer, Marker, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';

// Fix marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Custom user icon
const userIcon = new L.Icon({
  iconUrl: require('./placeholder.png'),
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

  useEffect(() => {
    const lat = Cookies.get('latitude');
    const lng = Cookies.get('longitude');
    if (lat && lng) {
      setLatitude(parseFloat(lat));
      setLongitude(parseFloat(lng));
    } else {
      setError("Location data not available. Please enable location services.");
      setLoading(false);
    }
  }, []);

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
    } catch (error) {
      setError(`Failed to fetch user response: ${error.message}`);
      setResponse(null);
    } finally {
      setFetchLoading(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (latitude && longitude && response && response.length > 0) {
      const map = mapRef.current?.leafletElement; // Check if mapRef is valid
      if (map) {
        // Clear existing routes before adding a new one
        map.eachLayer((layer) => {
          if (layer instanceof L.Routing.Control) {
            map.removeControl(layer);
          }
        });

        const waypoints = response.slice(0, 5).map(item => L.latLng(item.latitude, item.longitude));
        const userLocation = L.latLng(latitude, longitude);

        // Create the routing control and add the route to the map
        L.Routing.control({
          waypoints: [userLocation, ...waypoints],
          createMarker: () => null, // Prevent markers from being added to each waypoint
          routeWhileDragging: true, // Allow route to update while dragging
        }).addTo(map);
      }
    }
  }, [latitude, longitude, response]);

  return (
    <div className='main_container'>
      <div className="container">
        <div className="info-container">
          <h2 className="heading">Location Information</h2>
          {latitude && longitude ? (
            <p className="location-info">
              Latitude: {latitude.toFixed(6)}, Longitude: {longitude.toFixed(6)}
            </p>
          ) : (
            <p className="loading-text">Loading location information...</p>
          )}

          {!response && latitude && longitude && (
            <button onClick={fetchUserResponse} disabled={fetchLoading} className="fetch-button">
              {fetchLoading ? 'Fetching Response...' : 'Get User Response'}
            </button>
          )}
          {loading && !response && <p className="loading-text">Loading user response...</p>}
          {error && <p className="error-text">{error}</p>}

          {response && response.length > 0 && (
            <div className="cards-container">
              {response.map((item, index) => {
                const to = [item.latitude, item.longitude];
                const from = [latitude, longitude];
                const dist = haversineDistance(...from, ...to).toFixed(2);
                return (
                  <div key={index} className="card">
                    <h4 className="card-heading">{item.name}</h4>
                    <p><strong>Type:</strong> {item.type}</p>
                    <p><strong>City:</strong> {item.city}</p>
                    <p>{item.description}</p>
                    <p><strong>Coordinates:</strong> ({item.latitude}, {item.longitude})</p>
                    <p><strong>Distance:</strong> {dist} km</p> {/* Added distance here */}
                  </div>
                );
              })}
            </div>
          )}

          {!loading && !error && !response && latitude && longitude && (
            <p className="no-response-text">No response found after generation.</p>
          )}

          <div className="helpers">
              
          </div>
        
        </div>
      </div>

      {latitude && longitude && response && response.length > 0 && (
        <div className="map-wrapper">
          <MapContainer
            center={[latitude, longitude]}
            zoom={12}
            scrollWheelZoom={false}
            style={{ height: "100%", width: "100%", borderRadius: "12px" }}
            ref={mapRef} // Attach the mapRef to the MapContainer
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

            {response.slice(0, 5).map((item, index) => {
              const to = [item.latitude, item.longitude];
              // The distance calculation for the tooltip is already present,
              // but you were missing a Tooltip component wrapper.
              // I've moved the Tooltip content to be inside the Marker's Tooltip
              // and removed the redundant `React.Fragment` and standalone `Tooltip`
              // for the distance as it's typically shown in the popup/tooltip
              // associated with the *destination marker*.
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