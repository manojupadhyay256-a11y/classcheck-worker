// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getMessaging, type Messaging } from "firebase/messaging";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDFzjLyRJ-H52ufpnBKQP6KMAtmQg_nDMk",
    authDomain: "classcheck-69e1d.firebaseapp.com",
    projectId: "classcheck-69e1d",
    storageBucket: "classcheck-69e1d.firebasestorage.app",
    messagingSenderId: "290810693971",
    appId: "1:290810693971:web:6a0ca649bd084dfe1679a6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const VAPID_KEY = 'BHHS5QaElyhwlpuWJLSk2vynRAW11VlhZWbOnzA2qOfVdc5AKtkLx8tHR2dYUqSB58YcaqIUmGQbBllaH5niSXs';

// --- Lazy Messaging Initialization ---
// Do NOT call getMessaging() eagerly at module-load.
// On native Android/iOS (Capacitor WebView), the Firebase Web Messaging SDK
// is not supported and will throw, crashing the app immediately.
let _messagingInstance: Messaging | null = null;
let _messagingInitAttempted = false;

/**
 * Returns the Firebase Messaging instance, or null if messaging is not
 * available (native platforms, unsupported browsers, missing service worker).
 * Safe to call from any platform — will never throw.
 */
export async function getMessagingInstance(): Promise<Messaging | null> {
    // Only attempt initialization once
    if (_messagingInitAttempted) return _messagingInstance;
    _messagingInitAttempted = true;

    try {
        // Guard: Must be a browser environment with service worker support
        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
            console.log('[Firebase] Messaging not available: no service worker support');
            return null;
        }

        // Guard: Must be on HTTPS or localhost (SW requirement)
        const isSecure = location.protocol === 'https:' || location.hostname === 'localhost';
        if (!isSecure) {
            console.log('[Firebase] Messaging not available: not a secure context');
            return null;
        }

        // Attempt to register the Firebase messaging service worker first.
        // If this fails (e.g., file missing, native platform), skip messaging entirely
        // to avoid a loop where the SDK repeatedly tries to fetch a token.
        try {
            await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            console.log('[Firebase] Service worker registered successfully');
        } catch (swErr) {
            console.warn('[Firebase] Service worker registration failed, skipping messaging:', swErr);
            return null;
        }

        _messagingInstance = getMessaging(app);
        console.log('[Firebase] Messaging initialized successfully');
        return _messagingInstance;
    } catch (err) {
        console.warn('[Firebase] Failed to initialize messaging (safe fallback):', err);
        _messagingInstance = null;
        return null;
    }
}

export default app;