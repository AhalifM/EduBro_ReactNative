import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Import screens
import TutorProfileScreen from '../screens/tutor/TutorProfileScreen';
import TutorAvailabilityScreen from '../screens/tutor/TutorAvailabilityScreen';
import EditSubjectsScreen from '../screens/tutor/EditSubjectsScreen';
import EditProfileScreen from '../screens/tutor/EditProfileScreen';
import MessagesScreen from '../screens/messages/MessagesScreen';
import ManageSessionsScreen from '../screens/tutor/ManageSessionsScreen';

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
      }}
    >
      <Stack.Screen 
        name="TutorAvailability" 
        component={TutorAvailabilityScreen}
        options={{ headerTitle: 'Set Availability' }}
      />
      <Stack.Screen 
        name="ManageSessions" 
        component={ManageSessionsScreen}
        options={{ headerTitle: 'Manage Sessions' }}
      />
      <Stack.Screen 
        name="EditSubjects" 
        component={EditSubjectsScreen}
        options={{ headerTitle: 'Edit Subjects' }}
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
      }}
    >
      <Stack.Screen 
        name="TutorProfile" 
        component={TutorProfileScreen} 
        options={{ headerTitle: 'My Profile' }}
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
          } else if (route.name === 'Students') {
            iconName = 'groups';
          } else if (route.name === 'Messages') {
            iconName = 'chat';
          }

          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Schedule" 
        component={ScheduleStack} 
        options={{ title: 'My Schedule' }}
      />
      <Tab.Screen 
        name="Students" 
        component={StudentsScreen} 
        options={{ title: 'My Students' }}
      />
      <Tab.Screen 
        name="Messages" 
        component={MessagesScreen} 
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