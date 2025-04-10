import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';
import Constants from 'expo-constants';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCJOHXE9Z3-srnMUQYzUicit_sWQCf--XY",
  authDomain: "edubro-reactnative.firebaseapp.com",
  projectId: "edubro-reactnative",
  storageBucket: "edubro-reactnative.firebasestorage.app",
  messagingSenderId: "259668060218",
  appId: "1:259668060218:web:438174fdb051ddb4216d03",
  measurementId: "G-HD0N3WGL14"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth with AsyncStorage
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

const db = getFirestore(app);

// Initialize Firebase Storage with explicit bucket
let storage;
try {
  // Ensure the app instance is using the correct storageBucket
  if (!app.options.storageBucket) {
    console.log('Storage bucket was not defined in app, setting it explicitly');
    app.options.storageBucket = 'edubro-reactnative.firebasestorage.app';
  }
  
  // Initialize storage with the app instance that has the storage bucket set
  storage = getStorage(app);
  console.log('Firebase Storage initialized with bucket:', app.options.storageBucket);
  
  // Log detailed storage information for debugging
  console.log('Storage app name:', storage.app.name);
  console.log('Storage app options:', storage.app.options);
} catch (error) {
  console.error('Error initializing Firebase Storage:', error);
  
  // Try initializing with an explicit URL as a last resort
  try {
    console.log('Attempting to initialize storage with explicit bucket URL');
    storage = getStorage(app, 'gs://edubro-reactnative.firebasestorage.app');
    console.log('Storage initialized with explicit bucket URL');
  } catch (fallbackError) {
    console.error('Fallback initialization failed:', fallbackError);
    // Initialize with default as final fallback
    storage = getStorage();
    console.log('Firebase Storage initialized with default settings');
  }
}

// Conditionally initialize analytics (will skip in Expo Go)
let analytics = null;
try {
  // Check if analytics is supported before initializing
  isSupported().then(supported => {
    if (supported) {
      analytics = getAnalytics(app);
      console.log('Firebase Analytics initialized');
    } else {
      console.log('Firebase Analytics not supported in this environment');
    }
  });
} catch (error) {
  console.log('Error initializing Firebase Analytics:', error);
}

export { app, auth, db, storage, analytics }; 