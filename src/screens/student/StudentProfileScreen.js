import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, RefreshControl, ActivityIndicator, Platform } from 'react-native';
import { Text, Button, Card, Avatar, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { getCurrentUser, logoutUser, isValidImageUrl } from '../../utils/auth';
import { getUserSessions } from '../../utils/tutorUtils';
import { CommonActions } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

const StudentProfileScreen = ({ navigation }) => {
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [tutorCount, setTutorCount] = useState(0);
  const [courseCount, setCourseCount] = useState(0);
  const [avatarError, setAvatarError] = useState(false);
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

  // Safely determine profile image source
  const getProfileImageSource = () => {
    // Check if userProfile has a photoURL and it's a valid URL
    if (userProfile?.photoURL && 
        isValidImageUrl(userProfile.photoURL) && 
        !avatarError) {
      return { uri: userProfile.photoURL };
    }
    // Fallback to default avatar
    return require('../../../assets/icon.png');
  };

  useEffect(() => {
    // Reset avatar error state when user profile changes
    setAvatarError(false);
  }, [userProfile?.photoURL]);

  if (loading && !userProfile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9C27B0" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <StatusBar style="light" />
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#9C27B0']}
            tintColor={'#9C27B0'}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerContainer}>
          <LinearGradient
            colors={['#9C27B0', '#E91E63']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0.7 }}
            style={styles.headerGradient}
          >
            <View style={styles.headerContent}>
              <View style={styles.avatarContainer}>
                <Avatar.Image
                  size={100}
                  source={getProfileImageSource()}
                  style={styles.avatar}
                  onError={() => setAvatarError(true)}
                />
              </View>
              <Text style={styles.name}>{userProfile?.fullName || 'Student'}</Text>
              <Text style={styles.email}>{userProfile?.email || ''}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>Student</Text>
              </View>
              
              <Button 
                mode="contained" 
                style={styles.editProfileButton}
                buttonColor="#FFFFFF"
                textColor="#9C27B0"
                icon="account-edit"
                onPress={navigateToEditProfile}
              >
                Edit Profile
              </Button>
            </View>
          </LinearGradient>
        </View>

        <Card style={styles.statsCard} mode="elevated">
          <Card.Content>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Your Learning Journey</Text>
              <MaterialIcons name="school" size={24} color="#9C27B0" />
            </View>
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <View style={[styles.statBadge, { backgroundColor: '#673AB720' }]}>
                  <MaterialIcons name="book" size={24} color="#673AB7" />
                </View>
                <Text style={styles.statNumber}>{courseCount}</Text>
                <Text style={styles.statLabel}>Subjects</Text>
              </View>
              <View style={styles.statItem}>
                <View style={[styles.statBadge, { backgroundColor: '#9C27B020' }]}>
                  <MaterialIcons name="event" size={24} color="#9C27B0" />
                </View>
                <Text style={styles.statNumber}>{sessionCount}</Text>
                <Text style={styles.statLabel}>Sessions</Text>
              </View>
              <View style={styles.statItem}>
                <View style={[styles.statBadge, { backgroundColor: '#E91E6320' }]}>
                  <MaterialIcons name="people" size={24} color="#E91E63" />
                </View>
                <Text style={styles.statNumber}>{tutorCount}</Text>
                <Text style={styles.statLabel}>Tutors</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.infoCard} mode="elevated">
          <Card.Content>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Want to Become a Tutor?</Text>
              <MaterialIcons name="trending-up" size={24} color="#9C27B0" />
            </View>
            <View style={styles.tutorPromptContainer}>
              <MaterialIcons name="psychology" size={60} color="#E91E63" style={styles.tutorPromptIcon} />
              <Text style={styles.cardText}>
                Share your knowledge with other students and earn while helping others succeed.
              </Text>
              <Button 
                mode="contained" 
                style={styles.applyButton}
                buttonColor="#9C27B0"
                icon="account-tie"
                onPress={() => navigation.navigate('ApplyTutor')}
              >
                Apply to be a Tutor
              </Button>
            </View>
          </Card.Content>
        </Card>

        <Button
          mode="outlined"
          style={styles.logoutButton}
          textColor="#F44336"
          icon="logout-variant"
          onPress={handleLogout}
        >
          Logout
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  headerContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    margin: 16,
    marginTop: Platform.OS === 'ios' ? 44 : 16,
    elevation: 4,
    shadowColor: '#9C27B0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  headerGradient: {
    width: '100%',
    paddingTop: Platform.OS === 'ios' ? 0 : 20,
  },
  headerContent: {
    alignItems: 'center',
    padding: 24,
  },
  avatarContainer: {
    marginBottom: 16,
    borderRadius: 60,
    padding: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: "rgba(0,0,0,0.2)",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
  },
  avatar: {
    borderWidth: 4,
    borderColor: '#FFFFFF',
    backgroundColor: '#FFFFFF',
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  name: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  email: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 12,
    opacity: 0.8,
  },
  roleBadge: {
    backgroundColor: '#FFFFFF30',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  editProfileButton: {
    marginTop: 8,
    elevation: 2,
    minWidth: 160,
  },
  statsCard: {
    margin: 16,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  infoCard: {
    margin: 16,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  cardText: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
    textAlign: 'center',
    marginVertical: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 10,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  tutorPromptContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  tutorPromptIcon: {
    marginBottom: 12,
  },
  applyButton: {
    marginTop: 16,
    paddingHorizontal: 16,
    elevation: 2,
  },
  logoutButton: {
    margin: 16,
    marginTop: 8,
    marginBottom: 30,
    borderColor: '#F44336',
  },
});

export default StudentProfileScreen; 