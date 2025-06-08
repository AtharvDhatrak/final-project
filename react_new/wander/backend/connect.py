# config.py (Create this file separately)
# ------------------------------------

# main.py
# --------
from pymongo import MongoClient
import config  # Import the config

def connect_to_mongodb():
    """
    Connects to a MongoDB database.

    Returns:
        pymongo.MongoClient: A MongoClient instance connected to the database,
        or None if the connection fails.
    """
    connection_string = config.CONNECTION_STRING
    database_name = config.DATABASE_NAME

    try:
        # Create a MongoClient instance
        client = MongoClient(connection_string)

        # Access the database
        db = client[database_name]  # Use database name from config

        print(f"Successfully connected to MongoDB database: {db.name}")
        return client, db  # Return both client and db

    except Exception as e:
        print(f"An error occurred while connecting to MongoDB: {e}")
        return None, None



# if __name__ == "__main__":
#     # Example usage:
#     client, db = connect_to_mongodb()
#     if client:
#         # Access collections within the database
#         user_collection = db["user_data"]  # Access user_data collection
#         user_collection_2 = db["user_response"] #access user collection

#         # Perform operations on the collections
#         # For example:
#         print(user_collection.find_one())
#         print(user_collection_2.find_one())

#         # Close the connection when you're done
#         client.close()
#     else:
#         print("Failed to connect to the database.")
