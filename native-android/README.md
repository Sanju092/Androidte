Native Android overlay implementation for Hyd Metro Tracker.

Design follows Google Material 3 principles: compact top-app-bar proportions, rounded surfaces, clear typography, subtle elevation, and translucent surfaces so the overlay does not block the app underneath.

Overlay behavior:
- Single tap assistant ball: show/hide the translucent metro top bar.
- Hold assistant ball for 3 seconds: hide the top bar and keep the ball.
- Double tap assistant ball: stop tracking and remove both overlay elements.
- Tracking continues through the foreground service while the user is in another app.
- Near destination: vibration alert.
- At destination: stronger vibration alert.
