import React from 'react';
const GoogleMaps = () => {
    return (
        <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
          <input 
            type="text" 
            placeholder="Search places" 
            style={searchBarStyle} 
          />
          <iframe
            src="https://www.google.com/maps/embed"
            style={mapStyle}
            title="Map"
          />
        </div>
      );};

      const searchBarStyle = {
        position: 'absolute',
        top: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '80%',
        padding: '10px',
        borderRadius: '20px',
        border: '1px solid #ccc',
        zIndex: 10,
      };
      
      const mapStyle = {
        width: '100%',
        height: '100%',
        border: 'none',
      };
export default GoogleMaps;
