from user_response_db import user_response_db


db = user_response_db()  # Get the database object
collection = db.user_response # access collection
data = {"key": "value"}
collection.insert_one(data)
print("Data inserted")
collection2 = db.user_data
data2={"id":4,
       "name" : "pp",
       "password": 1111,
       "username" : "pppp"}
collection2.insert_one(data2)