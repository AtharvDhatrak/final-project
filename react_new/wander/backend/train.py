import numpy as np
import tensorflow as tf
from tensorflow import keras
import matplotlib.pyplot as plt

# 1. Generate some dummy data (replace with your actual data)
# Let's say we're trying to learn the relationship y = 2x + 1
X_train = np.array([1.0, 2.0, 3.0, 4.0, 5.0, 6.0], dtype=float)
y_train = np.array([3.0, 5.0, 7.0, 9.0, 11.0, 13.0], dtype=float)

# 2. Define the Model Architecture
model = keras.Sequential([keras.layers.Dense(units=1, input_shape=[1])])
# units=1: This layer has 1 neuron (output).
# input_shape=[1]: This layer expects 1 input feature.

# 3. Compile the Model (define optimizer, loss function, and metrics)
model.compile(optimizer='sgd', loss='mean_squared_error', metrics=['mse', 'mae'])
# optimizer='sgd': Stochastic Gradient Descent (how the model adjusts its weights).
# loss='mean_squared_error': The function to minimize during training.
# metrics=['mse', 'mae']: What to monitor during training (Mean Squared Error, Mean Absolute Error).

print("--- Starting Model Training ---")

# 4. Train the Model and capture the history
# The .fit() method is where the "training phase" happens.
# It iterates over the data multiple times (epochs).
history = model.fit(X_train, y_train, epochs=500, verbose=0)
# epochs=500: How many times the model will go through the entire dataset.
# verbose=0: Suppresses output during training, we'll print after.
# history: This object contains a record of loss values and metric values
#          at each epoch during training.

print("--- Training Complete ---")

# 5. Display the Training Phase Progress
# You can access the training metrics from the history object.
# For example, history.history['loss'] contains the loss at each epoch.
# history.history['mse'] contains the mean squared error at each epoch.

# Plotting the loss over epochs
plt.figure(figsize=(10, 6))
plt.plot(history.history['loss'], label='Training Loss')
plt.title('Model Training Loss Over Epochs')
plt.xlabel('Epoch')
plt.ylabel('Loss (Mean Squared Error)')
plt.legend()
plt.grid(True)
plt.show()

# Plotting other metrics (e.g., Mean Absolute Error)
plt.figure(figsize=(10, 6))
plt.plot(history.history['mae'], label='Training MAE', color='orange')
plt.title('Model Training Mean Absolute Error Over Epochs')
plt.xlabel('Epoch')
plt.ylabel('MAE')
plt.legend()
plt.grid(True)
plt.show()

# You can also print the final learned weights (for this simple model)
print(f"\nFinal learned weights: {model.get_weights()}")
print(f"Predicted value for 10.0: {model.predict(np.array([10.0]))[0][0]:.2f}")