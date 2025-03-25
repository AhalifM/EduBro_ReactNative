import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, RefreshControl } from 'react-native';
import { Text, Button, Card, Avatar, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { getCurrentUser, logoutUser } from '../../utils/auth';
import { getUserSessions } from '../../utils/tutorUtils';
import { CommonActions } from '@react-navigation/native';

const StudentProfileScreen = ({ navigation }) => {
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [tutorCount, setTutorCount] = useState(0);
  const [courseCount, setCourseCount] = useState(0);
  const theme = useTheme();

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const userData = await getCurrentUser();
      if (userData) {
        setUserProfile(userData);
        
        // Fetch sessions data
        const sessionsResult = await getUserSessions(userData.uid, 'student');
        if (sessionsResult.success) {
          const allSessions = sessionsResult.sessions;
          
          // Count total non-cancelled sessions
          const validSessions = allSessions.filter(
            session => session.status !== 'cancelled'
          );
          setSessionCount(validSessions.length);
          
          // Count unique tutors
          const uniqueTutorIds = new Set(
            validSessions.map(session => session.tutorId)
          );
          setTutorCount(uniqueTutorIds.size);
          
          // Count unique subjects (as courses)
          const uniqueSubjects = new Set(
            validSessions.map(session => session.subject)
          );
          setCourseCount(uniqueSubjects.size);
        }
      } else {
        // If no user data, redirect to Auth navigator
        const rootNavigation = navigation.getParent();
        if (rootNavigation) {
          rootNavigation.navigate('Auth');
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadUserProfile();
    
    // Refresh profile when the screen is focused
    const unsubscribe = navigation.addListener('focus', () => {
      loadUserProfile();
    });
    
    return unsubscribe;
  }, [navigation]);

  const onRefresh = () => {
    setRefreshing(true);
    loadUserProfile();
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      
      // Get the root navigation
      const rootNavigation = navigation.getParent();
      if (rootNavigation) {
        // Navigate to Auth stack
        rootNavigation.navigate('Auth');
      }
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };
  
  const navigateToEditProfile = () => {
    navigation.navigate('EditStudentProfile');
  };

  if (loading && !userProfile) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading profile...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2196F3']}
            tintColor={'#2196F3'}
          />
        }
      >
        <View style={styles.header}>
          <Avatar.Image
            size={100}
            source={userProfile?.photoURL ? { uri: userProfile.photoURL } : require('../../../assets/icon.png')}
            style={styles.avatar}
          />
          <Text style={styles.name}>{userProfile?.fullName || 'Student'}</Text>
          <Text style={styles.email}>{userProfile?.email || ''}</Text>
          <Text style={styles.role}>Student</Text>
          
          <Button 
            mode="outlined" 
            style={styles.editProfileButton}
            icon="account-edit-outline"
            onPress={navigateToEditProfile}
          >
            Edit Profile
          </Button>
        </View>

        <Card style={styles.infoCard}>
          <Card.Content>
            <Text style={styles.cardTitle}>Your Learning Journey</Text>
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{courseCount}</Text>
                <Text style={styles.statLabel}>Subjects</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{sessionCount}</Text>
                <Text style={styles.statLabel}>Sessions</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{tutorCount}</Text>
                <Text style={styles.statLabel}>Tutors</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.infoCard}>
          <Card.Content>
            <Text style={styles.cardTitle}>Want to Become a Tutor?</Text>
            <Text style={styles.cardText}>
              Share your knowledge with other students and earn while helping others succeed.
            </Text>
            <Button 
              mode="contained" 
              style={[styles.applyButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => navigation.navigate('ApplyTutor')}
            >
              Apply to be a Tutor
            </Button>
          </Card.Content>
        </Card>

        <View style={styles.buttonContainer}>
          <Button
            mode="outlined"
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            Logout
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  avatar: {
    marginBottom: 10,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  role: {
    fontSize: 14,
    color: '#888',
    backgroundColor: '#f0f0f0',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 15,
  },
  editProfileButton: {
    marginTop: 5,
    marginBottom: 10,
  },
  infoCard: {
    margin: 15,
    borderRadius: 10,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  cardText: {
    marginBottom: 15,
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 10,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  applyButton: {
    marginTop: 10,
    borderRadius: 8,
  },
  buttonContainer: {
    padding: 15,
    marginBottom: 20,
  },
  logoutButton: {
    borderRadius: 8,
  },
});

export default StudentProfileScreen; 