// Import and configure the Firebase SDK
// These scripts are made available when the app is served or deployed on Firebase Hosting
// If you're not using Firebase Hosting, replace these with specific versioned URLs
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// "Catch" the Firebase configuration and initialize
const firebaseConfig = {
    apiKey: "AIzaSyDFzjLyRJ-H52ufpnBKQP6KMAtmQg_nDMk",
    authDomain: "classcheck-69e1d.firebaseapp.com",
    projectId: "classcheck-69e1d",
    storageBucket: "classcheck-69e1d.firebasestorage.app",
    messagingSenderId: "290810693971",
    appId: "1:290810693971:web:6a0ca649bd084dfe1679a6"
};

firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();
const VAPID_KEY = "BHHS5QaElyhwlpuWJLSk2vynRAW11VlhzWb0nzA2qOfVdc5AKtkLx8tHR2dYUqsB58YcaqlUmGQbBlIaH5niSXs";

// If you want to customize the notification behavior, you can do so here
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);

    const notificationTitle = payload.notification.title || 'New Message';
    const notificationOptions = {
        body: payload.notification.body || 'You have a new message.',
        icon: '/icon.png' // Ensure this exists in public/
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
