// src/pages/chatbot.jsx
import React, { useState, useEffect, useRef } from 'react';
import Select from 'react-select'; // Import react-select
import axios from 'axios';
import '../styles/chatbot.css'; // Import the external CSS

// Main Chatbot component
function Chatbot({ monumentName, preExtractedInfo, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const [lastMentionedLocation, setLastMentionedLocation] = useState(null);
  const [isFetchingWikiInfo, setIsFetchingWikiInfo] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false); // State for TTS play/pause
  const [selectedLanguage, setSelectedLanguage] = useState({ value: 'en', label: 'English' }); // Default language

  // Define a more structured lexicon for the bot's responses.
  const nlpLexicon = {
    'hello': 'Hi there! How can I help you today?',
    'hi': 'Hello! What\'s on your mind?',
    'how are you': 'I am just a program, but I\'m doing great! How about you?',
    'what is your name': 'I don\'t have a name. I am a chatbot designed to assist you.',
    'help': 'I can answer basic questions and provide specific information about tourist locations. Try asking "Who created the Taj Mahal?" or "When was the Gateway of India created?". You can also ask follow-up questions like "When was it created?" after mentioning a location.',
    'bye': 'Goodbye! Have a great day!',
    'thank you': 'You\'re welcome!',
    'joke': 'Why don\'t scientists trust atoms? Because they make up everything!',

    // Tourist Location Information with structured data (local fallback/base)
    'paris': { description: 'Paris, the capital of France, is known as the "City of Love"...', created_by: null, created_on: null },
    'tokyo': { description: 'Tokyo, the bustling capital of Japan, offers a mix of futuristic skyscrapers...', created_by: null, created_on: null },
    'rome': { description: 'Rome, the "Eternal City" of Italy, is rich in history with ancient ruins...', created_by: null, created_on: null },
    'new york': { description: 'New York City, often called "The Big Apple," is a global hub for finance...', created_by: null, created_on: null },
    'london': { description: 'London, the capital of England, boasts historical landmarks like the Tower of London...', created_by: null, created_on: null },
    'india gate': { description: 'The India Gate is a war memorial located astride the Rajpath...', created_by: 'Edwin Lutyens (architect)', created_on: '1921 (construction began), 1931 (completed)' },
    'taj mahal': { description: 'The Taj Mahal is an ivory-white marble mausoleum on the right bank of the river Yamuna...', created_by: 'Ustad Ahmed Lahori (chief architect)', created_on: '1631 (construction began), 1653 (completed)' },
    'great wall of china': { description: 'The Great Wall of China is a series of fortifications that were built across the historical northern borders...', created_by: 'Various dynasties and emperors over centuries', created_on: '7th century BC (earliest sections), Ming Dynasty (most well-known sections, 1368-1644 AD)' },
    'pyramids of giza': { description: 'The Pyramids of Giza, located on the Giza Plateau in the outskirts of Cairo, Egypt, are ancient pyramids that served as tombs for pharaohs.', created_by: 'Ancient Egyptians (built for Pharaohs Khufu, Khafre, and Menkaure)', created_on: 'Circa 2580-2560 BC (Great Pyramid of Giza)' },
    'gateway of india': { description: 'The Gateway of India is an iconic arch-monument built in the early 20th century in Mumbai, India...', created_by: 'George Wittet (architect)', created_on: 'March 31, 1913 (foundation stone laid), 1924 (completed)' },
  };

  // Language options for the dropdown
  const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'hi', label: 'Hindi' },
    { value: 'mr', label: 'Marathi' },
    { value: 'fr', label: 'French' },
    { value: 'es', label: 'Spanish' },
    { value: 'it', label: 'Italian' },
  ];

  // Map language codes to Web Speech API lang values for better pronunciation
  const ttsLanguageMap = {
    'en': 'en-US',
    'hi': 'hi-IN',
    'mr': 'mr-IN',
    'fr': 'fr-FR',
    'es': 'es-ES',
    'it': 'it-IT',
  };

  // --- Translation Function ---
  const translateText = async (text, targetLang) => {
    if (targetLang === 'en') {
      return text; // No translation needed if target is English
    }
    try {
      const response = await axios.post('http://localhost:5000/translate', {
        text: text,
        target_language: targetLang,
      });
      return response.data.translated_text;
    } catch (error) {
      console.error('Error translating text:', error);
      return `[Translation Error: ${text}]`; // Fallback in case of error
    }
  };

  // Helper to add a message to the chat
  const addMessage = (sender, originalText, translatedText = null) => {
    setMessages((prevMessages) => [...prevMessages, { sender, originalText, translatedText: translatedText || originalText }]);
  };

  // Helper function to add a bot message without auto-speaking
  const addBotMessage = (originalText, translatedText) => {
    addMessage('bot', originalText, translatedText);
  };

  // Function to speak the given text using Web Speech API
  const speakText = (text, langCode) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech before starting a new one
      window.speechSynthesis.cancel();
      setIsSpeaking(true);

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = langCode;

      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = (event) => {
        console.error('SpeechSynthesisUtterance.onerror', event);
        setIsSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
    } else {
      console.warn('Text-to-speech not supported in this browser.');
    }
  };

  // Controls for TTS
  const toggleSpeech = (textToSpeak) => {
    if (!textToSpeak) return;

    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      setIsSpeaking(false);
    } else if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsSpeaking(true);
    } else {
      // Only speak if nothing is currently speaking or paused
      speakText(textToSpeak, ttsLanguageMap[selectedLanguage.value]);
    }
  };

  const stopSpeech = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  // --- useEffect to handle initial loading of monument info ---
  useEffect(() => {
    const initializeChat = async () => {
      setMessages([]); // Clear messages on initial load or language change
      stopSpeech(); // Stop any ongoing speech

      if (monumentName) {
        setLastMentionedLocation(monumentName.toLowerCase()); // Set context immediately

        if (preExtractedInfo) {
          // If pre-extracted info exists, display it directly
          const initialMessage = `Hello! Here's some information about **${monumentName}**:\n${preExtractedInfo}`;
          const translatedInitialMessage = await translateText(initialMessage, selectedLanguage.value);
          addBotMessage(initialMessage, translatedInitialMessage);
        } else {
          // If no pre-extracted info, fetch from Wiki and then display
          const loadingMessage = `Hello! You wanted to know more about **${monumentName}**? Please wait while I fetch more details...`;
          const translatedLoadingMessage = await translateText(loadingMessage, selectedLanguage.value);
          addBotMessage(loadingMessage, translatedLoadingMessage); // Display initial loading message

          setIsFetchingWikiInfo(true);
          try {
            const response = await axios.get(
              `http://localhost:5000/extract_more_info?monument_name=${encodeURIComponent(monumentName)}`
            );
            const fetchedText = `Here's more information about ${monumentName}: ${response.data.extracted_text}`;
            const translatedFetchedText = await translateText(fetchedText, selectedLanguage.value);
            addBotMessage(fetchedText, translatedFetchedText);
          } catch (err) {
            const errorMessage = `Sorry, I couldn't fetch more details about ${monumentName} at this time. Error: ${err.response?.data?.error || err.message}`;
            const translatedErrorMessage = await translateText(errorMessage, selectedLanguage.value);
            addBotMessage(errorMessage, translatedErrorMessage);
          } finally {
            setIsFetchingWikiInfo(false);
          }
        }
      } else {
        // General greeting if no monumentName is passed
        const defaultGreeting = "Hello! I'm your tourist chatbot. How can I assist you today?";
        const translatedDefaultGreeting = await translateText(defaultGreeting, selectedLanguage.value);
        addBotMessage(defaultGreeting, translatedDefaultGreeting);
      }
    };

    initializeChat();

  }, [monumentName, preExtractedInfo, selectedLanguage.value]); // Rerun when these props change

  // Function to generate a bot response based on user input and the lexicon
  const generateBotResponse = (userInput) => {
    const lowerCaseInput = userInput.toLowerCase();
    let currentFoundLocationKey = null;

    // 1. Try to identify a tourist location in the current input
    for (const keyword in nlpLexicon) {
      if (typeof nlpLexicon[keyword] === 'object' && lowerCaseInput.includes(keyword)) {
        currentFoundLocationKey = keyword;
        setLastMentionedLocation(keyword); // Update the last mentioned location for context
        break;
      }
    }

    // Determine which location to use for the query: current or last mentioned
    const locationToQuery = currentFoundLocationKey || lastMentionedLocation;

    if (locationToQuery && typeof nlpLexicon[locationToQuery] === 'object') {
      const locationData = nlpLexicon[locationToQuery];

      // Check for specific questions about creation
      if (lowerCaseInput.includes('who created') || lowerCaseInput.includes('built by') || lowerCaseInput.includes('creator')) {
        if (locationData.created_by) {
          return `The ${locationToQuery} was created by ${locationData.created_by}.`;
        } else {
          return `I don't have specific information about who created the ${locationToQuery}.`;
        }
      } else if (lowerCaseInput.includes('when was it created') || lowerCaseInput.includes('built on') || lowerCaseInput.includes('date of creation') || lowerCaseInput.includes('when was it built')) {
        if (locationData.created_on) {
          return `The ${locationToQuery} was created on/around ${locationData.created_on}.`;
        } else {
          return `I don't have specific information about when the ${locationToQuery} was created.`;
        }
      } else if (lowerCaseInput.includes('more info') || lowerCaseInput.includes('tell me more')) {
        // If user asks for more info, this indicates an API call will be made.
        // Returning an empty string here to ensure generateBotResponse doesn't add
        // a redundant message when handleSendMessage is about to do an API call.
        return '';
      }
      // If a location was found (either current or from context) but no specific question,
      // return the general description of that location.
      return locationData.description;
    }

    // If no location was found in the current input and no last mentioned location,
    // or if the query is a general one (like 'hello', 'joke'),
    // check for general lexicon entries.
    for (const keyword in nlpLexicon) {
      if (typeof nlpLexicon[keyword] === 'string' && lowerCaseInput.includes(keyword)) {
        setLastMentionedLocation(null); // Clear context for general queries
        return nlpLexicon[keyword];
      }
    }

    // If nothing matches, return the default response and clear context.
    setLastMentionedLocation(null);
    return 'I am sorry, I do not understand your request. Can you please rephrase it or ask for "help"?';
  };

  // Handles sending a message when the user clicks send or presses Enter
  const handleSendMessage = async () => {
    if (input.trim() === '') return;

    const userMessageText = input.trim();
    addMessage('user', userMessageText);

    setInput(''); // Clear input field immediately
    stopSpeech(); // Stop any ongoing speech when user types

    // Simulate bot thinking time before responding
    setTimeout(async () => {
      const lowerCaseInput = userMessageText.toLowerCase();
      let handledByApi = false; // Flag to track if API call was initiated

      // If the user asks for more info on the last mentioned monument
      if ((lowerCaseInput.includes('more info') || lowerCaseInput.includes('tell me more')) && lastMentionedLocation) {
        setIsFetchingWikiInfo(true);
        const loadingMessage = `Fetching more details about ${lastMentionedLocation}...`;
        const translatedLoadingMessage = await translateText(loadingMessage, selectedLanguage.value);
        addBotMessage(loadingMessage, translatedLoadingMessage);
        handledByApi = true; // Mark as handled by API

        try {
          const response = await axios.get(
            `http://localhost:5000/extract_more_info?monument_name=${encodeURIComponent(lastMentionedLocation)}`
          );
          const fetchedText = `Here's some more information about ${lastMentionedLocation}: ${response.data.extracted_text}`;
          const translatedFetchedText = await translateText(fetchedText, selectedLanguage.value);
          addBotMessage(fetchedText, translatedFetchedText);
        } catch (err) {
          const errorMessage = `Sorry, I couldn't fetch more details about ${lastMentionedLocation} at this time. Error: ${err.response?.data?.error || err.message}`;
          const translatedErrorMessage = await translateText(errorMessage, selectedLanguage.value);
          addBotMessage(errorMessage, translatedErrorMessage);
        } finally {
          setIsFetchingWikiInfo(false);
        }
      }

      // Only generate and add a bot response if not already handled by an API call
      if (!handledByApi) {
        const botResponseText = generateBotResponse(userMessageText);
        // Only add a message if generateBotResponse returns something meaningful (not empty string)
        if (botResponseText) {
          const translatedBotResponseText = await translateText(botResponseText, selectedLanguage.value);
          addBotMessage(botResponseText, translatedBotResponseText);
        }
      }
    }, 500); // 0.5 second delay for bot response
  };

  // Scrolls to the bottom of the chat messages whenever messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="chatbot-container-root">
      <div className="chatbot-window"> {/* Custom class for the main chat window */}
        {/* Chat Header */}
        <div className="chat-header"> {/* Custom class */}
          <h1 className="chat-title">Tourist Chatbot</h1> {/* Custom class */}
          {/* Internal Close Button (still useful if accessed directly or if external one is missed) */}
          <button onClick={onClose} className="close-button-internal"> {/* Custom class */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Language Selector */}
        <div className="language-selector-container">
          <label htmlFor="language-select">Translate to:</label>
          <Select
            id="language-select"
            options={languageOptions}
            value={selectedLanguage}
            onChange={setSelectedLanguage}
            className="react-select-container"
            classNamePrefix="react-select"
            isSearchable={false}
            styles={{
              control: (base) => ({
                ...base,
                width: '120px', // Adjust width as needed
              }),
            }}
          />
        </div>

        {/* Chat Messages Display Area */}
        <div className="chat-messages-display"> {/* Custom class */}
          {messages.length === 0 && !monumentName && (
            <div className="chat-welcome-message"> {/* Custom class */}
              Type something to start chatting! Try "Who created the Taj Mahal?" then "When was it created?".
              <br/><br/>
              Use the "Translate to" dropdown above to change the bot's language!
            </div>
          )}
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`message-row ${msg.sender === 'user' ? 'message-user' : 'message-bot'}`}
            >
              <div
                className={`message-bubble ${
                  msg.sender === 'user'
                    ? 'message-bubble-user'
                    : 'message-bubble-bot'
                }`}
              >
                {/* Display translated text for bot, original for user */}
                <span dangerouslySetInnerHTML={{ __html: msg.sender === 'bot' ? msg.translatedText : msg.originalText }} />
                {msg.sender === 'bot' && (
                  <div className="tts-controls">
                    <button
                      onClick={() => toggleSpeech(msg.translatedText)}
                      className="tts-button"
                      title={isSpeaking ? "Pause Speech" : "Play Speech"}
                    >
                      {isSpeaking ? (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
                          </svg>
                          Pause
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.36 1.626-1.003l11.314 6.073c.873.466.873 1.536 0 2l-11.314 6.073c-.709.357-1.626-.146-1.626-1.003V5.653Z" />
                          </svg>
                          Play
                        </>
                      )}
                    </button>
                    <button
                      onClick={stopSpeech}
                      className="tts-button"
                      title="Stop Speech"
                      disabled={!window.speechSynthesis.speaking && !window.speechSynthesis.paused}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                      Stop
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isFetchingWikiInfo && (
            <div className="message-row message-bot">
              <div className="message-bubble message-bubble-bot message-loading-spinner"> {/* Custom class */}
                <div className="spinner-small mr-2"></div>
                <p>Loading...</p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input Area */}
        <div className="chat-input-area"> {/* Custom class */}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSendMessage();
              }
            }}
            placeholder="Type your message..."
            className="input-field" 
          />
          <button
            onClick={handleSendMessage}
            className="send-button" 
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Chatbot;