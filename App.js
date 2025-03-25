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
    primary: '#4285F4',
    accent: '#FF8C00',
    background: '#FFFFFF',
    surface: '#FFFFFF',
    text: '#333333',
    error: '#D32F2F',
    notification: '#FF8C00',
    placeholder: '#9E9E9E',
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
