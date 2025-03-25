import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';

// Import screens
import StudentProfileScreen from '../screens/student/StudentProfileScreen';
import FindTutorScreen from '../screens/student/FindTutorScreen';
import TutorDetailScreen from '../screens/student/TutorDetailScreen';
import MySessionsScreen from '../screens/student/MySessionsScreen';
import MessagesScreen from '../screens/MessagesScreen';
import ChatDetailsScreen from '../screens/ChatDetailsScreen';
import ApplyTutorScreen from '../screens/student/ApplyTutorScreen';
import EditProfileScreen from '../screens/student/EditProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Stack navigators for screens that need nested navigation
const TutorsStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="FindTutor" component={FindTutorScreen} />
      <Stack.Screen 
        name="TutorDetail" 
        component={TutorDetailScreen}
        options={({ route }) => ({ 
          headerShown: true,
          title: route.params?.tutor?.displayName || 'Tutor Profile',
          headerTitleAlign: 'center'
        })}
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

// Stack navigator for sessions
const SessionsStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="SessionsList" component={MySessionsScreen} />
    </Stack.Navigator>
  );
};

// Profile stack
const ProfileStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Profile" component={StudentProfileScreen} />
      <Stack.Screen 
        name="ApplyTutor" 
        component={ApplyTutorScreen} 
        options={{
          headerShown: true,
          title: 'Apply to be a Tutor',
          headerTitleAlign: 'center'
        }}
      />
      <Stack.Screen 
        name="EditStudentProfile" 
        component={EditProfileScreen} 
        options={{
          headerShown: true,
          title: 'Edit Profile',
          headerTitleAlign: 'center'
        }}
      />
    </Stack.Navigator>
  );
};

const StudentNavigator = () => {
  const theme = useTheme();
  
  return (
    <Tab.Navigator
      initialRouteName="ProfileTab"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'ProfileTab') {
            iconName = 'person';
          } else if (route.name === 'TutorsTab') {
            iconName = 'school';
          } else if (route.name === 'SessionsTab') {
            iconName = 'event';
          } else if (route.name === 'MessagesTab') {
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
        name="TutorsTab" 
        component={TutorsStack} 
        options={{ title: 'Find Tutors' }}
      />
      <Tab.Screen 
        name="SessionsTab" 
        component={SessionsStack} 
        options={{ title: 'My Sessions' }}
      />
      <Tab.Screen 
        name="MessagesTab" 
        component={MessagesStack} 
        options={{ title: 'Messages' }}
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={ProfileStack} 
        options={{ title: 'My Profile' }}
      />
    </Tab.Navigator>
  );
};

export default StudentNavigator; 