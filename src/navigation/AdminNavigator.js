import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';

// Import screens
import AdminProfileScreen from '../screens/admin/AdminProfileScreen';

// Create placeholder screens for future development
const UsersScreen = () => <AdminProfileScreen />;
const TutorApplicationsScreen = () => <AdminProfileScreen />;
const AnalyticsScreen = () => <AdminProfileScreen />;

const Tab = createBottomTabNavigator();

const AdminNavigator = () => {
  const theme = useTheme();
  
  return (
    <Tab.Navigator
      initialRouteName="Profile"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Profile') {
            iconName = 'person';
          } else if (route.name === 'Users') {
            iconName = 'people';
          } else if (route.name === 'Applications') {
            iconName = 'assignment';
          } else if (route.name === 'Analytics') {
            iconName = 'insights';
          }

          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: 'gray',
        headerShown: true,
        headerTitleAlign: 'center',
      })}
    >
      <Tab.Screen 
        name="Users" 
        component={UsersScreen} 
        options={{ title: 'Manage Users' }}
      />
      <Tab.Screen 
        name="Applications" 
        component={TutorApplicationsScreen} 
        options={{ title: 'Applications' }}
      />
      <Tab.Screen 
        name="Analytics" 
        component={AnalyticsScreen} 
        options={{ title: 'Analytics' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={AdminProfileScreen} 
        options={{ title: 'Admin' }}
      />
    </Tab.Navigator>
  );
};

export default AdminNavigator; 