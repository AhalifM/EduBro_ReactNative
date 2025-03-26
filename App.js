import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
import AppNavigator from './src/navigation/AppNavigator';
import { LogBox } from 'react-native';
import { initializeDatabase } from './src/utils/dbSetup';
import { AuthProvider } from './src/contexts/AuthContext';

// Ignore specific logs
LogBox.ignoreLogs([
  'AsyncStorage has been extracted from react-native',
  'Constants.platform.ios.model has been deprecated',
  'Setting a timer for a long period of time',
  '@firebase/auth',
  '@firebase/firestore',
]);

// Create a custom theme
const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#9C27B0',         // Primary Purple (matches logo)
    secondary: '#E91E63',       // Secondary Pink (matches logo)
    accent: '#673AB7',          // Accent Deep Purple (matches logo)
    success: '#4CAF50',         // Success Green
    background: '#F8F9FA',      // Light Background
    surface: '#FFFFFF',         // White Surface
    text: '#212121',            // Dark Text
    secondaryText: '#757575',   // Medium Gray Secondary Text
    error: '#F44336',           // Error Red
    notification: '#9C27B0',    // Notification Purple (same as primary)
    placeholder: '#BDBDBD',     // Light Gray Placeholder Text
    card: '#FFFFFF',            // Card Background
    border: '#E0E0E0',          // Border Color
  },
  roundness: 12,                // More modern rounded corners
  animation: {
    scale: 1.0,                 // Default animation scale
  },
  fonts: {
    ...DefaultTheme.fonts,
    regular: {
      fontFamily: 'System',
      fontWeight: '400',
    },
    medium: {
      fontFamily: 'System',
      fontWeight: '500',
    },
    light: {
      fontFamily: 'System',
      fontWeight: '300',
    },
    thin: {
      fontFamily: 'System',
      fontWeight: '100',
    },
  },
};

export default function App() {
  // Initialize Firebase collections when the app starts
  useEffect(() => {
    const setupDatabase = async () => {
      try {
        await initializeDatabase();
        console.log('Database setup complete');
      } catch (error) {
        console.error('Database setup failed:', error);
      }
    };
    
    setupDatabase();
    
    // Note: Chat expiration functionality has been replaced with manual chat ending by tutors
    // No need for automatic cleanup
    
  }, []);

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <StatusBar style="auto" />
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
