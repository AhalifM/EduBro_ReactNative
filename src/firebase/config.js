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
  storageBucket: "edubro-reactnative.appspot.com",
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
const storage = getStorage(app);

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