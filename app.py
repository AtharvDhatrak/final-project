from flask import Flask, render_template, request, redirect, url_for, session
from backend.user_response_db import user_response_db  # Import your database class
import secrets


app = Flask(__name__)
db_instance = user_response_db()  # Instantiate your database class
user_collection = db_instance.user_data  # Access the user_data collection
app.secret_key=secrets.token_hex(32)
@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        name = request.form['name']
        username = request.form['username']
        password = request.form['password']

        # In a real application, you should:
        # 1. Check if the username already exists in the database.
        # 2. Hash the password before storing it.

        existing_user = user_collection.find_one({'username': username})
        if existing_user:
            return render_template('register.html', error='Username already exists')

        user_data = {
            'name': name,
            'username': username,
            'password': password  # Insecure: Store hashed password!
        }
        user_collection.insert_one(user_data)
        return redirect(url_for('login'))
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    session['username'] = username  # Store username in session

    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        # In a real application, you would:
        # 1. Retrieve the user from the database based on the username.
        # 2. Verify the password against the stored hash.

        user = user_collection.find_one({'username': username, 'password': password})
        if user:
            return redirect(url_for('user_permission'))  # Redirect to user_permission
        return render_template('login.html', error='Invalid username or password')
    return render_template('login.html')

@app.route('/user_permission')
def user_permission():
        return render_template('user_permission.html')

@app.route('/')
def index():
    return redirect(url_for('login'))

@app.route('/store_location', methods=['POST'])
def store_location():
    if 'username' in session and request.is_json:
        data = request.get_json()

        latitude = data.get('latitude')
        longitude = data.get('longitude')
        # username = session['username']

        if latitude is not None and longitude is not None:
            location_data = {
                'username': session['username'],  # Now using session
                'latitude': latitude,
                'longitude': longitude,
                'timestamp': datetime.utcnow() # Optional: Add a timestamp
            }
            print(location_data)

            user_response.insert_one(location_data)
            return {'success': True}
        else:
            return {'success': False, 'error': 'Latitude and longitude are required.'}, 400
    return {'success': False, 'error': 'Unauthorized or invalid request.'}, 401
    @app.route('/logout')
    
    
    def logout():
        session.clear()
        return redirect(url_for('login'))

if __name__ == '__main__':
    app.run(debug=True, port=5000)