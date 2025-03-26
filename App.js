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
    primary: '#2563EB',         // Primary Blue
    secondary: '#0EA5E9',       // Secondary Teal
    accent: '#F59E0B',          // Accent Orange
    success: '#10B981',         // Accent Green
    background: '#F8FAFC',      // Light Blue-Gray Background
    surface: '#FFFFFF',         // White Surface
    text: '#1F2937',            // Dark Gray Text
    secondaryText: '#6B7280',   // Medium Gray Secondary Text
    error: '#F43F5E',           // Error Red
    notification: '#F59E0B',    // Notification Orange (same as accent)
    placeholder: '#9CA3AF',     // Placeholder Text
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
