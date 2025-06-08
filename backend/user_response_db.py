from pymongo import MongoClient

def user_response_db():
# Replace with your MongoDB Atlas connection string
    connection_string = "mongodb+srv://atharvdhatrak45:pRl6qFcCMXVydlpM@response.aoxdmfm.mongodb.net/?retryWrites=true&w=majority&appName=response"

    try:
        # Create a MongoClient instance
        client = MongoClient(connection_string)

        # Access a specific database (replace 'your_database_name')
        db = client['user-response']

        # You are now connected to the database!
        print(f"Successfully connected to MongoDB database: {db.name}")


    except Exception as e:
        print(f"An error occurred while connecting to MongoDB: {e}")

    return client.user_response_db