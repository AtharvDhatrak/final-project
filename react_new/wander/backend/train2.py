import pandas as pd
from math import radians, sin, cos, sqrt, atan2
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

def haversine(lat1, lon1, lat2, lon2):
    """
    Calculate the distance between two points on Earth using the Haversine formula.
    Returns distance in kilometers.
    """
    R = 6371  # Radius of Earth in kilometers

    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])

    dlon = lon2 - lon1
    dlat = lat2 - lat1

    a = sin(dlat / 2)**2 + cos(lat1) * cos(lat2) * sin(dlon / 2)**2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))

    distance = R * c
    return distance

def recommend_locations(user_lat, user_lon, user_preferences_text="", num_results=5, max_distance_km=100):
    """
    Recommends locations based on user's coordinates and textual preferences.

    Args:
        user_lat (float): Latitude of the user.
        user_lon (float): Longitude of the user.
        user_preferences_text (str): A string describing user interests (e.g., "historical monuments, art museums").
        num_results (int): The number of top recommendations to return.
        max_distance_km (int): Maximum distance to consider locations (for initial geospatial filter).

    Returns:
        list: A list of dictionaries, each representing a recommended location with all its details.
    """
    try:
        # Load the dataset
        locations_df = pd.read_csv("attractions_data.csv")
    except FileNotFoundError:
        print("Error: attractions_data.csv not found. Please create the CSV file.")
        return []

    # 1. Geospatial Filtering
    # Calculate distances for all locations
    locations_df['distance_km'] = locations_df.apply(
        lambda row: haversine(user_lat, user_lon, row['Latitude'], row['Longitude']),
        axis=1
    )

    # Filter by maximum distance
    filtered_locations_df = locations_df[locations_df['distance_km'] <= max_distance_km].copy()

    if filtered_locations_df.empty:
        print(f"No locations found within {max_distance_km} km of your location.")
        return []

    # 2. Content-Based Filtering (using TF-IDF for simplicity)
    # Combine location significance with user preferences for vectorization
    # If user preferences are empty, we just use location significance.
    corpus = filtered_locations_df['Significance'].tolist()

    # Add user preferences to the corpus for vectorization
    if user_preferences_text:
        corpus.append(user_preferences_text)

    vectorizer = TfidfVectorizer(stop_words='english')
    tfidf_matrix = vectorizer.fit_transform(corpus)

    if user_preferences_text:
        # User preference vector is the last one in the matrix
        user_vector = tfidf_matrix[-1]
        location_vectors = tfidf_matrix[:-1]
        # Calculate cosine similarity between user preferences and location significances
        content_similarities = cosine_similarity(user_vector, location_vectors).flatten()
        filtered_locations_df['content_similarity'] = content_similarities
    else:
        # If no user preferences, treat all content similarities as equal (or based on some default)
        filtered_locations_df['content_similarity'] = 1.0 # Or you could use a weighted score from other factors


    # 3. Combine Scores and Rank (Simple Weighted Average - this is where an ML model would go)
    # You can adjust these weights based on what you consider more important
    # For a simple heuristic: prioritize closer locations and higher content similarity
    # You can add more complex logic here, e.g., penalize high fees, prioritize high ratings.
    
    # Normalize distances (smaller distance = higher score)
    min_dist = filtered_locations_df['distance_km'].min()
    max_dist = filtered_locations_df['distance_km'].max()
    if max_dist > min_dist:
        filtered_locations_df['normalized_distance_score'] = 1 - (filtered_locations_df['distance_km'] - min_dist) / (max_dist - min_dist)
    else:
        filtered_locations_df['normalized_distance_score'] = 1.0 # All equally close

    # Normalize Google Review Rating
    min_rating = filtered_locations_df['Google Review Rating'].min()
    max_rating = filtered_locations_df['Google Review Rating'].max()
    if max_rating > min_rating:
        filtered_locations_df['normalized_rating_score'] = (filtered_locations_df['Google Review Rating'] - min_rating) / (max_rating - min_rating)
    else:
        filtered_locations_df['normalized_rating_score'] = 1.0

    # Simple weighted score (adjust weights as needed)
    # If user_preferences_text is not provided, content_similarity will be 1.0, effectively making it less impactful
    # unless you change its default value or normalize it differently.
    
    # Example weights: distance (most important), then content, then rating
    weight_distance = 0.5
    weight_content = 0.3 if user_preferences_text else 0.0 # Content matters more if preferences given
    weight_rating = 0.2

    filtered_locations_df['final_score'] = (
        weight_distance * filtered_locations_df['normalized_distance_score'] +
        weight_content * filtered_locations_df['content_similarity'] +
        weight_rating * filtered_locations_df['normalized_rating_score']
    )
    
    # Sort by the final score (descending)
    recommended_locations = filtered_locations_df.sort_values(by='final_score', ascending=False)

    # Prepare output
    output_list = []
    for index, row in recommended_locations.head(num_results).iterrows():
        output_list.append({
            "Zone": row['Zone'],
            "State": row['State'],
            "City": row['City'],
            "Name": row['Name'],
            "Type": row['Type'],
            "Establishment Year": int(row['Establishment Year']),
            "Time Needed (hrs)": float(row['Time Needed (hrs)']),
            "Google Review Rating": float(row['Google Review Rating']),
            "Entrance Fee (INR)": int(row['Entrance Fee (INR)']),
            "Airport within 50km Radius": row['Airport within 50km Radius'],
            "Weekly Off": row['Weekly Off'],
            "Significance": row['Significance'],
            "DSLR Allowed": row['DSLR Allowed'],
            "Number of Google Reviews (in lakhs)": float(row['Number of Google Reviews (in lakhs)']),
            "Best Time to Visit": row['Best Time to Visit'],
            "Latitude": float(row['Latitude']),
            "Longitude": float(row['Longitude']),
            "Distance (km)": round(row['distance_km'], 2), # Add distance for user info
            "Relevance Score": round(row['final_score'], 4) # For debugging/understanding
        })
    return output_list

# --- Example Usage ---
if __name__ == "__main__":
    # Create a dummy dataset file for testing
    # Make sure this CSV matches the structure above
    dummy_data = """ID,Name,Type,Zone,State,City,Establishment Year,Time Needed (hrs),Google Review Rating,Entrance Fee (INR),Airport within 50km Radius,Weekly Off,Significance,DSLR Allowed,Number of Google Reviews (in lakhs),Best Time to Visit,Latitude,Longitude
1,Eiffel Tower,Landmark,Ile-de-France,Paris,Paris,1889,2.5,4.7,2500,Yes,None,"Iconic wrought-iron lattice tower, symbol of Paris, offers panoramic views.",Yes,70,Evening,48.8584,2.2945
2,Louvre Museum,Museum,Ile-de-France,Paris,Paris,1793,4.7,1500,Yes,Tuesday,"World's largest art museum, home to the Mona Lisa and Venus de Milo.",Yes,55,Morning,48.8606,2.3376
3,Notre-Dame Cathedral,Religious Site,Ile-de-France,Paris,Paris,1163,1.5,4.6,0,Yes,None,"Historic Catholic cathedral, famous for its Gothic architecture and gargoyles.",Yes,40,Anytime,48.8530,2.3499
4,Sacré-Cœur Basilica,Religious Site,Ile-de-France,Paris,Paris,1914,1.0,4.7,0,Yes,None,"Stunning white basilica offering incredible city views from Montmartre.",Yes,30,Sunset,48.8867,2.3431
5,Arc de Triomphe,Monument,Ile-de-France,Paris,Paris,1836,1.0,4.7,1300,Yes,None,"Triumphal arch honoring those who fought for France, great views from top.",Yes,28,Anytime,48.8738,2.2950
6,Gateway of India,Monument,West,Maharashtra,Mumbai,1924,1.0,4.5,0,Yes,None,"Historic arch monument built to commemorate the landing of King George V.",Yes,12,Evening,18.9220,72.8347
7,Chhatrapati Shivaji Maharaj Vastu Sangrahalaya,Museum,West,Maharashtra,Mumbai,1922,3.0,4.6,700,Yes,Monday,"Prominent museum in Mumbai, showcasing Indian history, art, and natural history.",Yes,8,Anytime,18.9272,72.8329
8,Red Fort,Fortress,North,Delhi,Delhi,1639,3.0,4.5,950,Yes,Monday,"Historic fort in Delhi, served as the main residence of the Mughal emperors.",Yes,15,Morning,28.6562,77.2410
9,India Gate,Monument,North,Delhi,Delhi,1931,1.0,4.6,0,Yes,None,"War memorial dedicated to soldiers of British India, iconic landmark.",Yes,20,Evening,28.6129,77.2295
10,Taj Mahal,Monument,North,Uttar Pradesh,Agra,1653,3.0,4.8,1100,Yes,Friday,"Iconic ivory-white marble mausoleum, a UNESCO World Heritage Site.",Yes,60,Sunrise,27.1751,78.0421
11,Qutub Minar,Minaret,North,Delhi,Delhi,1192,2.0,4.6,600,Yes,None,"UNESCO World Heritage Site, a minaret and victory tower.",Yes,10,Anytime,28.5245,77.1855
12,Humayun's Tomb,Tomb,North,Delhi,Delhi,1570,2.0,4.5,600,Yes,None,"Tomb of the Mughal Emperor Humayun, precursor to the Taj Mahal.",Yes,7,Anytime,28.5936,77.2589
"""
    with open("attractions_data.csv", "w") as f:
        f.write(dummy_data)

    # User in Pimpri-Chinchwad, Maharashtra, India (approximate coordinates)
    user_lat = 18.6298
    user_lon = 73.7999

    print(f"User Location: ({user_lat}, {user_lon}) - Pimpri-Chinchwad, Maharashtra, India\n")

    # Scenario 1: Recommend locations based on proximity only
    print("--- Recommendations (Proximity Only) ---")
    recommendations_proximity = recommend_locations(user_lat, user_lon, num_results=5, max_distance_km=1000) # Increased radius for dummy data
    if recommendations_proximity:
        for i, loc in enumerate(recommendations_proximity):
            print(f"\nRecommendation {i+1}:")
            for key, value in loc.items():
                print(f"  {key}: {value}")
    else:
        print("No recommendations found.")

    # Scenario 2: Recommend locations based on proximity AND user preferences
    print("\n--- Recommendations (Proximity + User Preferences: 'historical monuments, ancient architecture') ---")
    user_interests = "historical monuments, ancient architecture, old buildings"
    recommendations_with_preferences = recommend_locations(user_lat, user_lon, user_preferences_text=user_interests, num_results=5, max_distance_km=1000)
    if recommendations_with_preferences:
        for i, loc in enumerate(recommendations_with_preferences):
            print(f"\nRecommendation {i+1}:")
            for key, value in loc.items():
                print(f"  {key}: {value}")
    else:
        print("No recommendations found.")

    print("\n--- Recommendations (Proximity + User Preferences: 'art museums, paintings') ---")
    user_interests_art = "art museums, paintings, sculptures"
    recommendations_art = recommend_locations(user_lat, user_lon, user_preferences_text=user_interests_art, num_results=5, max_distance_km=1000)
    if recommendations_art:
        for i, loc in enumerate(recommendations_art):
            print(f"\nRecommendation {i+1}:")
            for key, value in loc.items():
                print(f"  {key}: {value}")
    else:
        print("No recommendations found.")