from pymongo import MongoClient

def user_info():
    connection_string = "mongodb+srv://atharvdhatrak45:DyMQZqm6eBtgidfr@user-info.gxqivw9.mongodb.net/?retryWrites=true&w=majority&appName=user-info"

    try:
        # Create a MongoClient instance
        client = MongoClient(connection_string)

        # Access a specific database (replace 'your_database_name')
        db = client['user-info']

        # You are now connected to the database!
        print(f"Successfully connected to MongoDB database: {db.name}")


    except Exception as e:
        print(f"An error occurred while connecting to MongoDB: {e}")