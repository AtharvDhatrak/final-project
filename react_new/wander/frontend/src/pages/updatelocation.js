// Function to enable location tracking
function enableLocationTracking() {
    const token = localStorage.getItem('token'); // Get the token from local storage
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;

            // Call the function to update the user's location in the database
            updateUserLocation(token, latitude, longitude);
        }, (error) => {
            console.error("Error getting location: ", error);
        });
    } else {
        console.error("Geolocation is not supported by this browser.");
    }
}

// Function to update user location in the database
async function updateUserLocation(token, latitude, longitude) {
    try {
        const response = await fetch('/update-location', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ latitude, longitude })
        });

        const data = await response.json();
        console.log(data);
    } catch (error) {
        console.error("Error updating user location:", error);
    }
}

// Event listener for enabling location tracking
document.getElementById('enableLocationButton').addEventListener('click', enableLocationTracking);