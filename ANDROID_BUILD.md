# Android APK build

This project is a React/Vite app wrapped with Capacitor for Android.

## Build APK automatically

1. Put the `app` folder in a GitHub repository.
2. Push to the `main` branch.
3. Open **Actions → Build Android APK**.
4. After the workflow finishes, open the workflow run and download **HydMetroTracker-debug-apk**.
5. Extract the artifact and install `app-debug.apk` on Android.

The debug APK is suitable for direct sideloading/testing. It is not a Play Store release-signed APK.

The workflow also declares Android coarse/fine location permissions because the tracker uses the device GPS.

## Native overlay features

The Android build now includes a foreground location service and system overlay assistant ball.
- Single tap ball: show/hide the metro top bar.
- Hold ball for 3 seconds: hide the top bar and keep the ball.
- Double tap ball: stop tracking and remove the overlay.
- Near destination: vibration alert.
- At destination: stronger vibration alert.

For local Android Studio builds, run `npm install`, `npm run build`, `npx cap add android`, `npx cap sync android`, then `bash scripts_patch_android.sh` and open the `android` folder in Android Studio.

## UI update
The rebuilt project uses a Material 3-inspired visual system for the in-app tracker and a translucent Material-style overlay/FAB for the Android background experience. The overlay remains intentionally compact so YouTube/Home/other apps stay readable underneath it.

## v2 changes
- Permissions are now an in-app setup card (Location + Display over other apps); the overlay starts only when both are granted, and Settings is opened only when you tap the button.
- If the overlay toggle is blocked: Settings → Apps → Hyd Metro Tracker → ⋮ → Allow restricted settings.
- Native overlay: dp-sized draggable ball, click-through top bar, safer foreground-service start.
