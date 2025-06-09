import pandas as pd
from geopy.distance import geodesic
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from connect import connect_to_mongodb # Assuming connect.py is in the same directory

# --- NEW IMPORTS FOR SCRAPING AND AI ---
import requests
from bs4 import BeautifulSoup
from googletrans import Translator # Import the Translator for text translation
import re # For regex in Wikipedia cleaning
import csv # For CSV file operations
import os  # For path checking
import logging # For logging events
# --- END NEW IMPORTS ---

# Set up logging for better debugging and monitoring
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Enable CORS for the frontend running on localhost:3000
CORS(app, resources={r"/*": {
    "origins": "http://localhost:3000",
    "methods": ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    "allow_headers": ["Content-Type", "Authorization"]
}})

# Establish database connection
client, db = connect_to_mongodb()
if not client:
    logger.error("Failed to connect to MongoDB. Application will exit.")
    exit(1)

# tourist_places_df will NOT be loaded here at startup anymore.
# It will be loaded inside the /give_user_response_api route.

# Initialize Google Translator
translator = Translator()
logger.info("Google Translator initialized.")

# Define the path for the extracted info CSV file
CSV_FILE_PATH = 'extracted_monument_info.csv'
CSV_HEADERS = ['Monument Name', 'Extracted Info']


# --- HELPER FUNCTION FOR WIKIPEDIA SCRAPING ---
def get_wikipedia_summary(title, max_words=500):
    """
    Scrapes the Wikipedia page for a given title and extracts a text summary.
    """
    search_title = title.replace(" ", "_") # Wikipedia uses underscores for spaces
    url = f"https://en.wikipedia.org/wiki/{search_title}"
    
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status() # Raise an HTTPError for bad responses (4xx or 5xx)
        soup = BeautifulSoup(response.text, 'html.parser')

        # Find the main content div
        content_div = soup.find('div', id='mw-content-text')
        if not content_div:
            logger.warning(f"No main content div found for Wikipedia page: {title}")
            return None # No main content found

        # Target the first few paragraphs in the main parser output
        parser_output_div = content_div.find('div', class_='mw-parser-output')
        if not parser_output_div:
            logger.warning(f"No parser output div found for Wikipedia page: {title}")
            return None # No parser output found within content

        paragraphs = parser_output_div.find_all('p', recursive=False)
        
        extracted_text_words = []
        word_count = 0

        for p in paragraphs:
            text = p.get_text().strip()
            # Skip common non-informational paragraphs like disambiguation notices or "From Wikipedia..."
            if not text or \
               p.find('b', string="From Wikipedia, the free encyclopedia") or \
               'This article is about' in text or \
               'may refer to:' in text or \
               'coordinates on OpenStreetMap' in text or \
               'This is a redirect from' in text: # Skip redirect notices
                continue

            # Basic cleaning: remove text in parentheses (e.g., pronunciation guides) and citations
            # This regex pattern handles non-nested parentheses, and removes [citations]
            cleaned_text = re.sub(r'\([^()]*?\)', '', text)
            cleaned_text = re.sub(r'\[.*?\]', '', cleaned_text)
            cleaned_text = requests.utils.unquote(cleaned_text) # Decode URL-encoded characters if any
            cleaned_text = cleaned_text.strip()
            
            words = cleaned_text.split()
            for word in words:
                if word_count < max_words:
                    extracted_text_words.append(word)
                    word_count += 1
                else:
                    break
            if word_count >= max_words:
                break
        
        if not extracted_text_words:
            # Fallback: if specific paragraph extraction fails, try to get some general text
            all_text_fallback_raw = ' '.join([p.get_text() for p in content_div.find_all('p')])
            all_text_fallback_cleaned = re.sub(r'\([^()]*?\)', '', all_text_fallback_raw)
            all_text_fallback_cleaned = re.sub(r'\[.*?\]', '', all_text_fallback_cleaned)
            all_text_fallback_cleaned = requests.utils.unquote(all_text_fallback_cleaned).strip()
            words_fallback = all_text_fallback_cleaned.split()[:max_words]
            return ' '.join(words_fallback)

        return ' '.join(extracted_text_words)

    except requests.exceptions.Timeout:
        logger.error(f"Error: Request to Wikipedia timed out for '{title}'.")
        return f"Error: Request to Wikipedia timed out for '{title}'."
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching Wikipedia page for '{title}': {e}")
        return f"Error fetching Wikipedia page for '{title}': {e}"
    except Exception as e:
        logger.error(f"Error processing Wikipedia page for '{title}': {e}")
        return f"Error processing Wikipedia page for '{title}': {e}"

# -------- REGISTER ROUTE --------
@app.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        required_fields = ['username', 'password', 'email', 'name', 'phone']
        if not data or not all(field in data for field in required_fields):
            logger.warning(f"Registration attempt with missing fields: {data}")
            return jsonify({'error': 'Missing required registration fields'}), 400

        username = data['username']
        password = data['password']
        email = data['email']
        name = data['name']
        phone = data['phone']

        user_collection = db["user_data"]

        # Uniqueness checks
        if user_collection.find_one({'username': username}):
            logger.warning(f"Registration attempt for existing username: {username}")
            return jsonify({'error': 'Username already exists'}), 409
        if user_collection.find_one({'email': email}):
            logger.warning(f"Registration attempt for existing email: {email}")
            return jsonify({'error': 'Email already exists'}), 409

        hashed_password = generate_password_hash(password)

        new_user = {
            'name': name,
            'email': email,
            'phone': phone,
            'username': username,
            'password': hashed_password,
            'registration_date': datetime.utcnow()
        }

        result = user_collection.insert_one(new_user)
        logger.info(f"User '{username}' registered successfully with userId: {result.inserted_id}")
        return jsonify({'message': 'Registration successful', 'userId': str(result.inserted_id)}), 201

    except Exception as e:
        logger.exception("Error during registration:") # Logs traceback
        return jsonify({'error': f'An error occurred during registration: {str(e)}'}), 500

# -------- LOGIN ROUTE --------
@app.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        if not data or 'username' not in data or 'password' not in data:
            logger.warning(f"Login attempt with missing fields: {data}")
            return jsonify({'error': 'Missing username or password'}), 400

        username = data['username']
        password = str(data['password'])

        user_collection = db["user_data"]
        user = user_collection.find_one({'username': username})

        if user:
            stored_password_hash = user.get('password')
            if isinstance(stored_password_hash, str) and check_password_hash(stored_password_hash, password):
                logger.info(f"User '{username}' logged in successfully.")
                return jsonify({'message': 'Login successful', 'userId': str(user['_id'])}), 200
            else:
                logger.warning(f"Failed login attempt for username: {username} (invalid password)")
                return jsonify({'error': 'Invalid credentials'}), 401
        else:
            logger.warning(f"Failed login attempt for username: {username} (user not found)")
            return jsonify({'error': 'Invalid credentials'}), 401

    except Exception as e:
        logger.exception("Error during login:")
        return jsonify({'error': f'An error occurred during login: {str(e)}'}), 500

# -------- GET USER RESPONSE ROUTE (Nearest Locations - CSV loaded per request) --------
@app.route('/give_user_response_api', methods=['GET'])
def give_user_response():
    # --- CSV LOADING LOGIC MOVED HERE ---
    tourist_places_df_local = pd.DataFrame() # Local DataFrame for this request
    script_dir = os.path.dirname(__file__)
    csv_file_path = os.path.join(script_dir, 'tourist_places_300_rows.csv')

    try:
        logger.info(f"Loading CSV from: {csv_file_path} for current request.")
        if not os.path.exists(csv_file_path):
            raise FileNotFoundError(f"CSV file not found at: {csv_file_path}")

        temp_df = pd.read_csv(csv_file_path)

        required_columns = ['Name', 'Type', 'City', 'Latitude', 'Longitude']
        if not all(col in temp_df.columns for col in required_columns):
            missing_cols = [col for col in required_columns if col not in temp_df.columns]
            raise ValueError(f"Missing essential columns in CSV: {', '.join(missing_cols)}")
        
        if 'City' in temp_df.columns:
            temp_df['City'] = temp_df['City'].astype(str)

        temp_df['Latitude'] = pd.to_numeric(temp_df['Latitude'], errors='coerce')
        temp_df['Longitude'] = pd.to_numeric(temp_df['Longitude'], errors='coerce')
        
        initial_rows_count = len(temp_df)
        temp_df.dropna(subset=['Latitude', 'Longitude'], inplace=True)
        rows_dropped_due_to_nan = initial_rows_count - len(temp_df)

        if rows_dropped_due_to_nan > 0:
            logger.warning(f"Dropped {rows_dropped_due_to_nan} rows from CSV due to invalid Latitude/Longitude values during request.")
        
        if temp_df.empty:
            logger.error("After loading and cleaning, tourist_places_df is empty for this request. Check CSV content.")
            return jsonify([]), 200 # Return empty if no usable data
        else:
            tourist_places_df_local = temp_df
            logger.debug(f"CSV loaded successfully for request. Usable rows: {len(tourist_places_df_local)}")

    except FileNotFoundError as e:
        logger.error(f"ERROR during request: {e}. CSV not found.")
        return jsonify({'error': f'Server data (CSV) not found: {str(e)}'}), 500
    except pd.errors.EmptyDataError:
        logger.error(f"ERROR during request: 'tourist_places_300_rows.csv' is empty.")
        return jsonify({'error': 'Server data (CSV) is empty'}), 500
    except ValueError as e:
        logger.error(f"ERROR during request: {e}. Check CSV column headers.")
        return jsonify({'error': f'Server data (CSV) has incorrect format: {str(e)}'}), 500
    except Exception as e:
        logger.exception(f"An unexpected error occurred during CSV loading for request: {e}")
        return jsonify({'error': f'An unexpected error occurred while processing data: {str(e)}'}), 500
    # --- END CSV LOADING LOGIC FOR THIS REQUEST ---

    try:
        latitude = request.args.get('latitude')
        longitude = request.args.get('longitude')

        if not latitude or not longitude:
            logger.warning("give_user_response_api call with missing latitude/longitude.")
            return jsonify({'error': 'Missing required parameters: latitude and/or longitude'}), 400

        try:
            latitude = float(latitude)
            longitude = float(longitude)
        except ValueError:
            logger.warning(f"give_user_response_api call with invalid latitude/longitude: lat={latitude}, lon={longitude}")
            return jsonify({'error': 'Invalid latitude or longitude'}), 400

        logger.debug(f"Received request for nearest locations at User Lat: {latitude}, User Lon: {longitude}")
        
        # Pass the locally loaded DataFrame to the function
        nearest_locations = find_nearest_locations(latitude, longitude, tourist_places_df=tourist_places_df_local)
        
        if not nearest_locations:
            logger.warning("find_nearest_locations returned an empty list.")
            return jsonify([]), 200 # Explicitly return empty array with 200 OK

        locations_with_descriptions = []
        for location in nearest_locations:
            description = generate_location_description(location)
            location['description'] = description
            locations_with_descriptions.append(location)

        logger.info(f"Successfully provided {len(locations_with_descriptions)} nearest locations for lat={latitude}, lon={longitude}")
        logger.debug(f"Nearest locations response: {locations_with_descriptions}")
        return jsonify(locations_with_descriptions), 200

    except Exception as e:
        logger.exception("Error processing user response (nearest locations):")
        return jsonify({'error': f'An unexpected error occurred on the server: {str(e)}'}), 500

# Function to find nearest locations based on latitude and longitude
# Modified to accept tourist_places_df as an argument
# Function to find nearest locations based on latitude and longitude
# Modified to ensure unique monument names in the results
def find_nearest_locations(user_lat, user_lon, num_locations=5, tourist_places_df=pd.DataFrame()):
    logger.debug(f"Inside find_nearest_locations for user_lat={user_lat}, user_lon={user_lon}")
    if tourist_places_df.empty:
        logger.warning("Tourist places DataFrame is empty within find_nearest_locations. Cannot process locations.")
        return []

    logger.debug(f"DataFrame has {len(tourist_places_df)} rows for processing.")
    all_distances = []
    
    for index, row in tourist_places_df.iterrows(): 
        place_name = row.get('Name')
        place_type = row.get('Type')
        place_city = row.get('City')
        place_lat = row.get('Latitude')
        place_lon = row.get('Longitude')
        
        if pd.isna(place_lat) or pd.isna(place_lon) or not isinstance(place_lat, (int, float)) or not isinstance(place_lon, (int, float)):
            logger.warning(f"Skipping place '{place_name}' (Index: {index}) due to invalid or missing coordinates from DataFrame: Lat={place_lat}, Lon={place_lon}")
            continue

        user_coords = (user_lat, user_lon)
        place_coords = (place_lat, place_lon)
        
        try:
            distance = geodesic(user_coords, place_coords).kilometers
            
            all_distances.append({
                'name': place_name,
                'type': place_type,
                'city': place_city,
                'latitude': place_lat,
                'longitude': place_lon,
                'distance': distance
            })
        except ValueError as e:
            logger.error(f"Error calculating geodesic distance for {place_name} (Index: {index}) at coords {place_coords}: {e}")
            continue
    
    logger.debug(f"Finished processing all DataFrame rows. Found {len(all_distances)} places with valid coordinates.")
    
    # Sort all valid locations by distance
    all_distances = sorted(all_distances, key=lambda x: x['distance'])
    
    # Filter to get unique monument names, prioritizing the nearest one first
    unique_locations = []
    seen_names = set()
    for loc in all_distances:
        if loc['name'] not in seen_names:
            unique_locations.append(loc)
            seen_names.add(loc['name'])
        if len(unique_locations) >= num_locations: # Stop once we have enough unique ones
            break
    
    final_result = unique_locations # This list will now contain unique names
    logger.debug(f"Returning {len(final_result)} nearest UNIQUE locations from sorted list.")
    return final_result
# Function to generate a textual description for each place
def generate_location_description(location):
    name = location.get('name', 'Unknown Place')
    type = location.get('type', 'site')
    city = location.get('city', 'an unknown city')
    distance = location.get('distance', 0)
    
    description = (f"{name} is a {type} located in {city}. "
                   f"It is approximately {distance:.2f} kilometers away from your current location. "
                   "It is a popular tourist destination known for its cultural significance and scenic views.")
    return description

# -------- EXTRACT MORE INFO API (Consolidated) --------
@app.route('/extract_more_info', methods=['GET'])
def extract_more_info():
    monument_name = request.args.get('monument_name')

    if not monument_name:
        logger.warning("extract_more_info call with missing 'monument_name'.")
        return jsonify({"error": "Missing 'monument_name' parameter"}), 400

    extracted_text = None
    extraction_error = None
    save_status = "pending"
    save_message = ""

    try:
        wikipedia_text_raw = get_wikipedia_summary(monument_name, max_words=500)

        if wikipedia_text_raw and not wikipedia_text_raw.startswith("Error:"):
            extracted_text = wikipedia_text_raw
            logger.info(f"Successfully extracted Wikipedia summary for '{monument_name}'.")

            try:
                file_exists = os.path.exists(CSV_FILE_PATH)
                with open(CSV_FILE_PATH, 'a', newline='', encoding='utf-8') as csvfile:
                    writer = csv.writer(csvfile)
                    if not file_exists:
                        writer.writerow(CSV_HEADERS)
                    writer.writerow([monument_name, extracted_text])
                save_status = "success"
                save_message = "Information saved to CSV successfully."
                logger.info(f"Successfully saved extracted info for '{monument_name}' to '{CSV_FILE_PATH}'.")
            except Exception as e:
                save_status = "error"
                save_message = f"Failed to save info to CSV: {e}"
                logger.error(f"Failed to save extracted info for '{monument_name}' to CSV: {e}", exc_info=True)

        else:
            extraction_error = wikipedia_text_raw if wikipedia_text_raw and wikipedia_text_raw.startswith("Error:") else f"Could not extract information for '{monument_name}' from Wikipedia or page not found."
            logger.warning(f"Wikipedia extraction failed for '{monument_name}': {extraction_error}")

    except Exception as e:
        extraction_error = f"An unexpected error occurred during Wikipedia extraction for '{monument_name}': {e}"
        logger.exception(f"An unexpected error occurred during Wikipedia extraction for '{monument_name}':")

    return jsonify({
        "extracted_text": extracted_text,
        "extraction_error": extraction_error,
        "save_status": save_status,
        "save_message": save_message
    })

# -------- TRANSLATION API --------
@app.route('/translate', methods=['POST'])
def translate_text_api():
    data = request.json
    text_to_translate = data.get('text')
    target_language = data.get('target_language', 'en')

    if not text_to_translate:
        logger.warning("Translation request received with no text.")
        return jsonify({"error": "No text provided for translation"}), 400

    try:
        translated = translator.translate(text_to_translate, dest=target_language)
        logger.info(f"Text translated to '{target_language}'.")
        return jsonify({"translated_text": translated.text})
    except Exception as e:
        logger.exception("Translation error:")
        return jsonify({"error": str(e)}), 500

# -------- ASK OUR AI API --------
@app.route('/ask_ai', methods=['POST'])
def ask_ai():
    data = request.get_json()
    monument_name = data.get('monument_name')
    question = data.get('question')

    if not monument_name or not question:
        logger.warning(f"Ask AI request with missing monument name or question: {data}")
        return jsonify({"error": "Missing 'monument_name' or 'question' in request body"}), 400

    ai_answer = ""
    if "taj mahal" in monument_name.lower():
        ai_answer = "The Taj Mahal is a breathtaking symbol of eternal love. Its intricate marble work changes color with the light, and its perfect symmetry is truly astounding. Did you know it took over 20,000 artisans and craftsmen to build it?"
    elif "gateway of india" in monument_name.lower():
        ai_answer = "The Gateway of India is a majestic landmark in Mumbai. It's a popular gathering spot and holds significant historical importance as a former entry point to India. The architecture is a blend of Indian and Saracenic styles. It's often called the 'Taj Mahal of Mumbai'."
    elif "qutub minar" in monument_name.lower():
        ai_answer = "The Qutub Minar is a towering minaret in Delhi, a UNESCO World Heritage Site. It's an excellent example of Indo-Islamic architecture, adorned with intricate carvings and verses from the Quran. Its construction began in the 12th century."
    elif "red fort" in monument_name.lower():
        ai_answer = "The Red Fort is a historic fort in Delhi, serving as the main residence of the Mughal emperors for nearly 200 years. It's a UNESCO World Heritage site and a symbol of India's rich Mughal history. The fort's walls are made of red sandstone, giving it its name."
    else:
        ai_answer = f"I'm an AI, and I can tell you that {monument_name} is a fascinating place. However, I don't have detailed specific information to answer that question right now. Try asking a more general question about it!"
    
    logger.info(f"AI answered question about '{monument_name}'.")
    return jsonify({
        "monument_name": monument_name,
        "question": question,
        "answer": ai_answer
    }), 200

# -------- SAVE LOCATION ROUTE --------
user_locations_collection = db['user_locations']
@app.route('/save_location', methods=['POST'])
def save_location():
    try:
        data = request.get_json()
        user_id = data.get('userId')
        latitude = data.get('latitude')
        longitude = data.get('longitude')

        if not all([user_id, latitude, longitude]):
            logger.warning(f"Save location request with missing data: {data}")
            return jsonify({'error': 'Missing location data'}), 400

        location_data = {
            'user_id': user_id,
            'latitude': latitude,
            'longitude': longitude,
            'timestamp': datetime.utcnow()
        }

        user_locations_collection.insert_one(location_data)

        logger.info(f"Location saved for user {user_id}: Lat={latitude}, Lng={longitude}")
        return jsonify({'message': 'Location saved successfully'}), 200
    except Exception as e:
        logger.exception("Error saving location:")
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500

if __name__ == '__main__':
    logger.info("Starting Flask application...")
    # Ensure the CSV file for extracted info exists with headers if it's new
    if not os.path.exists(CSV_FILE_PATH):
        try:
            with open(CSV_FILE_PATH, 'w', newline='', encoding='utf-8') as csvfile:
                writer = csv.writer(csvfile)
                writer.writerow(CSV_HEADERS)
            logger.info(f"Created new CSV file: '{CSV_FILE_PATH}' with headers.")
        except Exception as e:
            logger.error(f"Failed to create CSV file '{CSV_FILE_PATH}': {e}")
    
    app.run(debug=True, port=5000)