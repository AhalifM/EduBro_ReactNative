import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme, DefaultTheme } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Import screens
import TutorProfileScreen from '../screens/tutor/TutorProfileScreen';
import TutorAvailabilityScreen from '../screens/tutor/TutorAvailabilityScreen';
import EditSubjectsScreen from '../screens/tutor/EditSubjectsScreen';
import EditProfileScreen from '../screens/tutor/EditProfileScreen';
import MessagesScreen from '../screens/MessagesScreen';
import ChatDetailsScreen from '../screens/ChatDetailsScreen';
import ManageSessionsScreen from '../screens/tutor/ManageSessionsScreen';
import SessionRequestsScreen from '../screens/tutor/SessionRequestsScreen';
import TutorIncomeScreen from '../screens/tutor/TutorIncomeScreen';

// Create placeholder screens for missing features
const StudentsScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>My Students Screen</Text>
  </View>
);

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const NativeStack = createNativeStackNavigator();

// Stack navigator for schedule
const ScheduleStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#9C27B0',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="TutorAvailability" 
        component={TutorAvailabilityScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ManageSessions" 
        component={ManageSessionsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="SessionRequests" 
        component={SessionRequestsScreen}
        options={{ headerTitle: 'Session Requests' }}
      />
      <Stack.Screen 
        name="EditSubjects" 
        component={EditSubjectsScreen}
        options={{ headerTitle: 'Edit Subjects' }}
      />
    </Stack.Navigator>
  );
};

// Stack navigator for messages
const MessagesStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#9C27B0',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="MessagesList" 
        component={MessagesScreen}
        options={{ title: 'Messages' }}
      />
      <Stack.Screen 
        name="ChatDetails" 
        component={ChatDetailsScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

// Stack navigator for profile
const ProfileStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#9C27B0',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="TutorProfile" 
        component={TutorProfileScreen} 
        options={{ 
          headerShown: false 
        }}
      />
      <Stack.Screen 
        name="EditSubjects" 
        component={EditSubjectsScreen} 
        options={{ headerTitle: 'Edit Subjects' }}
      />
      <Stack.Screen 
        name="EditProfile" 
        component={EditProfileScreen} 
        options={{ headerTitle: 'Edit Profile' }}
      />
    </Stack.Navigator>
  );
};

const TutorNavigator = () => {
  const theme = useTheme();
  
  return (
    <Tab.Navigator
      initialRouteName="Profile"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Profile') {
            iconName = 'person';
          } else if (route.name === 'Schedule') {
            iconName = 'schedule';
          } else if (route.name === 'Income') {
            iconName = 'attach-money';
          } else if (route.name === 'Messages') {
            iconName = 'chat';
          }

          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#9C27B0',
        tabBarInactiveTintColor: '#9E9E9E',
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 90 : 70,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 30 : 10,
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E5E5',
          borderTopWidth: 1,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginBottom: Platform.OS === 'ios' ? 0 : 4,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Schedule" 
        component={ScheduleStack} 
        options={{ title: 'My Schedule' }}
      />
      <Tab.Screen 
        name="Income" 
        component={TutorIncomeScreen} 
        options={{ title: 'My Income' }}
      />
      <Tab.Screen 
        name="Messages" 
        component={MessagesStack} 
        options={{ title: 'Messages' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileStack} 
        options={{ title: 'My Profile' }}
      />
    </Tab.Navigator>
  );
};

export default TutorNavigator; 