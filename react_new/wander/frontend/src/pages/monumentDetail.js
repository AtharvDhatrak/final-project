// src/pages/MonumentDetail.js
import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import Chatbot from './chatbot'; // Import the Chatbot component
import '../styles/MonumentDetail.css';

const MonumentDetail = () => {
  const location = useLocation();
  const monumentDetails = location.state?.monument;

  // State for Wikipedia extraction
  const [extractLoading, setExtractLoading] = useState(false);
  const [extractedInfo, setExtractedInfo] = useState(null);
  const [extractError, setExtractError] = useState(null);

  // State to manage chatbot popup visibility and data
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [chatbotMonumentName, setChatbotMonumentName] = useState(null);
  const [chatbotPreExtractedInfo, setChatbotPreExtractedInfo] = useState(null);

  // If monumentDetails isn't available
  if (!monumentDetails) {
    return (
      <div className="monument-detail-container">
        <div className="detail-not-found">
          Monument details not found. Please return to the previous page.
        </div>
        <Link to="/information-display" className="back-link">Back to Map</Link>
      </div>
    );
  }

  // --- Handlers ---

  const handleExtractMoreInfo = async () => {
    setExtractLoading(true);
    setExtractedInfo(null);
    setExtractError(null);
    try {
      const response = await axios.get(
        `http://localhost:5000/extract_more_info?monument_name=${encodeURIComponent(monumentDetails.name)}`
      );
      setExtractedInfo(response.data.extracted_text);
    } catch (err) {
      setExtractError(`Failed to extract more information: ${err.response?.data?.error || err.message}`);
    } finally {
      setExtractLoading(false);
    }
  };

  // Handle "Ask Our AI" button click to open chatbot popup
  const handleAskOurAI = () => {
    // Set data for the chatbot
    setChatbotMonumentName(monumentDetails.name);
    setChatbotPreExtractedInfo(extractedInfo); // Pass existing extracted info
    setIsChatbotOpen(true); // Open the chatbot popup
  };

  // Function to close the chatbot popup
  const handleCloseChatbot = () => {
    setIsChatbotOpen(false);
    setChatbotMonumentName(null); // Clear data when closed
    setChatbotPreExtractedInfo(null); // Clear data when closed
  };


  return (
    <div className="monument-detail-wrapper"> {/* New wrapper for popup positioning */}
      <div className="monument-detail-container">
        <h1>{monumentDetails.name}</h1>
        <p><strong>Type:</strong> {monumentDetails.type}</p>
        <p><strong>City:</strong> {monumentDetails.city}</p>
        <p>{monumentDetails.description}</p>
        <p><strong>Coordinates:</strong> ({monumentDetails.latitude}, {monumentDetails.longitude})</p>
        {/* Corrected line below */}
        <p><strong>Distance:</strong> {monumentDetails.distance ? `${monumentDetails.distance.toFixed(2)} km` : 'N/A'}</p> 

        {/* Buttons for additional actions */}
        <div className="button-group">
          <button
            onClick={handleExtractMoreInfo}
            disabled={extractLoading}
            className="action-button extract-button"
          >
            {extractLoading ? 'Extracting...' : 'Extract More Information'}
          </button>

          <button
            onClick={handleAskOurAI}
            className="action-button ai-button"
          >
            Ask Our AI
          </button>
        </div>

        {/* Display extracted information with loader */}
        {extractLoading && (
          <div className="info-loader">
            <div className="spinner"></div>
            <p>Extracting information from Wikipedia...</p>
          </div>
        )}
        {extractedInfo && !extractLoading && (
          <div className="extra-info-section">
            <h3>More Information from Wikipedia</h3>
            <p className="extracted-text">{extractedInfo}</p>
          </div>
        )}
        {extractError && <p className="error-message">{extractError}</p>}

        {/* Back to Map Link */}
        <Link to="/information-display" className="back-link">Back to Map</Link>
      </div>

      {/* Chatbot Popup Container */}
      {isChatbotOpen && (
        <div className="chatbot-overlay">
          <div className="chatbot-popup-content">
            {/* Link to close the chatbot, positioned outside the chatbot component itself */}
            <Chatbot
              monumentName={chatbotMonumentName}
              preExtractedInfo={chatbotPreExtractedInfo}
              onClose={handleCloseChatbot} // Still pass this prop to the internal X button
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MonumentDetail;