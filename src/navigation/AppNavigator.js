import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';

// Import Navigators
import AuthNavigator from './AuthNavigator';
import StudentNavigator from './StudentNavigator';
import TutorNavigator from './TutorNavigator';
import AdminNavigator from './AdminNavigator';

// Import Loading Screen
import LoadingScreen from '../screens/LoadingScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
  const { user, role, loading } = useAuth();

  // Show loading screen while checking authentication
  if (loading) {
    return <LoadingScreen />;
  }

  // Determine which stack to show
  const getInitialRouteName = () => {
    if (!user) return 'Auth';
    
    switch (role) {
      case 'student': return 'Student';
      case 'tutor': return 'Tutor';
      case 'admin': return 'Admin';
      default: return 'Auth';
    }
  };

  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName={getInitialRouteName()}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Auth" component={AuthNavigator} />
        <Stack.Screen name="Student" component={StudentNavigator} />
        <Stack.Screen name="Tutor" component={TutorNavigator} />
        <Stack.Screen name="Admin" component={AdminNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator; 