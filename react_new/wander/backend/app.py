import pandas as pd
from geopy.distance import geodesic
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from connect import connect_to_mongodb

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
    print("Failed to connect to MongoDB. Application will exit.")
    exit(1)

# Load tourist places data from CSV
tourist_places_df = pd.read_csv('tourist_places_300_rows.csv')

# -------- REGISTER ROUTE --------
@app.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        required_fields = ['username', 'password', 'email', 'name', 'phone']
        if not data or not all(field in data for field in required_fields):
            return jsonify({'error': 'Missing required registration fields'}), 400

        username = data['username']
        password = data['password']
        email = data['email']
        name = data['name']
        phone = data['phone']

        user_collection = db["user_data"]

        # Uniqueness checks
        if user_collection.find_one({'username': username}):
            return jsonify({'error': 'Username already exists'}), 409
        if user_collection.find_one({'email': email}):
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
        return jsonify({'message': 'Registration successful', 'userId': str(result.inserted_id)}), 201

    except Exception as e:
        print(f"Error during registration: {e}")
        return jsonify({'error': f'An error occurred during registration: {str(e)}'}), 500

# -------- LOGIN ROUTE --------
@app.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        if not data or 'username' not in data or 'password' not in data:
            return jsonify({'error': 'Missing username or password'}), 400

        username = data['username']
        password = str(data['password'])  # Ensure it's a string

        user_collection = db["user_data"]
        user = user_collection.find_one({'username': username})

        if user:
            stored_password_hash = user.get('password')
            print(f"Stored password hash: {stored_password_hash}, type: {type(stored_password_hash)}")  # Debug line

            if isinstance(stored_password_hash, str) and check_password_hash(stored_password_hash, password):
                return jsonify({'message': 'Login successful', 'userId': str(user['_id'])}), 200
            else:
                return jsonify({'error': 'Invalid credentials'}), 401
        else:
            return jsonify({'error': 'Invalid credentials'}), 401

    except Exception as e:
        print(f"Error during login: {e}")
        return jsonify({'error': f'An error occurred during login: {str(e)}'}), 500

# -------- GET USER RESPONSE ROUTE --------
@app.route('/give_user_response_api', methods=['GET'])
def give_user_response():
    try:
        # Read parameters from query string
        latitude = request.args.get('latitude')
        longitude = request.args.get('longitude')

        # Validate inputs
        if not latitude or not longitude:
            return jsonify({'error': 'Missing required parameters: latitude and/or longitude'}), 400

        try:
            latitude = float(latitude)
            longitude = float(longitude)
        except ValueError:
            return jsonify({'error': 'Invalid latitude or longitude'}), 400

        # Continue with the rest of your logic...
        nearest_locations = find_nearest_locations(latitude, longitude)
        locations_with_descriptions = []
        for location in nearest_locations:
            description = generate_location_description(location)
            location['description'] = description
            locations_with_descriptions.append(location)

        return jsonify(locations_with_descriptions), 200

    except Exception as e:
        print(f"Error processing user response: {e}")
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500

# Function to find nearest locations based on latitude and longitude
def find_nearest_locations(user_lat, user_lon, num_locations=5):
    nearest_locations = []

    # Calculate distances to each tourist place
    for _, row in tourist_places_df.iterrows():
        place_lat = row['Latitude']
        place_lon = row['Longitude']
        place_name = row['Name']
        place_type = row['Type']
        place_city = row['City']
        
        # Calculate the distance between user and the tourist place
        user_coords = (user_lat, user_lon)
        place_coords = (place_lat, place_lon)
        distance = geodesic(user_coords, place_coords).kilometers

        # Avoid adding duplicate locations by checking if it's already in the list
        existing_location = next((loc for loc in nearest_locations if loc['name'] == place_name and loc['latitude'] == place_lat and loc['longitude'] == place_lon), None)

        if not existing_location:
            nearest_locations.append({
                'name': place_name,
                'type': place_type,
                'city': place_city,
                'latitude': place_lat,
                'longitude': place_lon,
                'distance': distance
            })

    # Sort by distance and return the nearest ones
    nearest_locations = sorted(nearest_locations, key=lambda x: x['distance'])
    return nearest_locations[:num_locations]

# Function to generate a textual description for each place
def generate_location_description(location):
    name = location['name']
    type = location['type']
    city = location['city']
    distance = location['distance']
    
    # Example description based on place details
    description = (f"{name} is a {type} located in {city}. "
                   f"It is approximately {distance:.2f} kilometers away from your current location. "
                   "It is a popular tourist destination known for its cultural significance and scenic views.")

    return description

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
            return jsonify({'error': 'Missing location data'}), 400

        # Create a location document
        location_data = {
            'user_id': user_id,
            'latitude': latitude,
            'longitude': longitude,
            'timestamp': datetime.utcnow()  # You can add a timestamp for when the location was saved
        }

        # Save the location data to MongoDB
        user_locations_collection.insert_one(location_data)

        print(f"Saving location for user {user_id}: Lat={latitude}, Lng={longitude}")
        return jsonify({'message': 'Location saved successfully'}), 200
    except Exception as e:
        print(f"Error saving location: {e}")
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500

# Main runner for the Flask app
if __name__ == '__main__':
    app.run(debug=True)
