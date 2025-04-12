import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, RefreshControl, ActivityIndicator, ImageBackground, Platform } from 'react-native';
import { Text, Button, Card, Avatar, useTheme, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { getAllSubjects, getUserSessions } from '../../utils/tutorUtils';
import { logoutUser, isValidImageUrl } from '../../utils/auth';
import { CommonActions } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'react-native';

const TutorProfileScreen = ({ navigation }) => {
  const { user, signOut, refreshUserData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState([]);
  const [todaySessionCount, setTodaySessionCount] = useState(0);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [studentsHelped, setStudentsHelped] = useState(0);
  const [avatarError, setAvatarError] = useState(false);
  const theme = useTheme();

  // Format rating with one decimal place
  const rating = useMemo(() => user?.rating?.toFixed(1) || 'New', [user?.rating]);

  const fetchData = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      // Only show loading indicators on first load, not on refresh
      // to prevent flickering
      
      // Refresh user data from Firestore to get latest ratings
      await refreshUserData();
      
      // Parallel data fetching for better performance
      const [subjectsResult, sessionsResult] = await Promise.all([
        getAllSubjects(),
        getUserSessions(user.uid, 'tutor')
      ]);
      
      if (subjectsResult.success) {
        const userSubjects = subjectsResult.subjects.filter(
          subject => user.subjects?.includes(subject.id)
        );
        setSubjects(userSubjects);
      }
      
      if (sessionsResult.success) {
        const allSessions = sessionsResult.sessions;
        
        // Count today's sessions
        const today = new Date().toISOString().split('T')[0];
        const todayCount = allSessions.filter(
          session => session.date === today && session.status === 'confirmed'
        ).length;
        setTodaySessionCount(todayCount);
        
        // Count completed sessions
        const completedSessions = allSessions.filter(
          session => session.status === 'completed'
        );
        setSessionsCompleted(completedSessions.length);
        
        // Count unique students helped
        const uniqueStudentIds = new Set(
          allSessions
            .filter(session => session.status === 'completed' || session.status === 'confirmed')
            .map(session => session.studentId)
        );
        setStudentsHelped(uniqueStudentIds.size);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setLoadingSessions(false);
      setRefreshing(false);
    }
  }, [user?.uid, refreshUserData]);

  // Use useFocusEffect instead of useEffect + addListener
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      
      const loadData = async () => {
        if (isMounted) {
          await fetchData();
        }
      };
      
      loadData();
      
      return () => {
        isMounted = false;
      };
    }, [fetchData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const handleLogout = async () => {
    try {
      await signOut();
      await logoutUser();
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Auth' }],
        })
      );
    } catch (error) {
      console.error('Error logging out:', error);
      Alert.alert('Error', 'Failed to log out');
    }
  };

  // Memoize the subject chips to prevent unnecessary re-renders
  const subjectChips = useMemo(() => {
    return subjects.map((subject) => (
      <Chip 
        key={`${subject.id}`}
        style={styles.subjectChip}
        textStyle={{ color: '#9C27B0' }}
      >
        {subject.name || 'Unknown Subject'}
      </Chip>
    ));
  }, [subjects]);

  // Memoize the teaching stats section
  const teachingStatsSection = useMemo(() => {
    return (
      <Card style={styles.statsCard} mode="elevated">
        <Card.Content>
          <Text style={styles.cardTitle}>Your Teaching Stats</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <View style={[styles.statBadge, { backgroundColor: '#9C27B020' }]}>
                <MaterialIcons name="school" size={24} color="#9C27B0" />
              </View>
              <Text style={styles.statNumber}>{sessionsCompleted}</Text>
              <Text style={styles.statLabel}>Sessions</Text>
            </View>
            <View style={styles.statItem}>
              <View style={[styles.statBadge, { backgroundColor: '#E91E6320' }]}>
                <MaterialIcons name="people" size={24} color="#E91E63" />
              </View>
              <Text style={styles.statNumber}>{studentsHelped}</Text>
              <Text style={styles.statLabel}>Students</Text>
            </View>
            <View style={styles.statItem}>
              <View style={[styles.statBadge, { backgroundColor: '#673AB720' }]}>
                <MaterialIcons name="book" size={24} color="#673AB7" />
              </View>
              <Text style={styles.statNumber}>{subjects.length}</Text>
              <Text style={styles.statLabel}>Subjects</Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  }, [sessionsCompleted, studentsHelped, subjects.length]);

  // Memoize the upcoming sessions section
  const upcomingSessionsSection = useMemo(() => {
    return (
      <Card style={styles.infoCard} mode="elevated">
        <Card.Content>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Upcoming Sessions</Text>
            <MaterialIcons name="event" size={24} color="#9C27B0" />
          </View>
          {loadingSessions ? (
            <View style={styles.loadingSessionContainer}>
              <ActivityIndicator size="small" color="#9C27B0" />
              <Text style={styles.loadingText}>Loading sessions...</Text>
            </View>
          ) : (
            <View style={styles.sessionStatusContainer}>
              <MaterialIcons 
                name={todaySessionCount > 0 ? "event-available" : "event-busy"} 
                size={36} 
                color={todaySessionCount > 0 ? "#4CAF50" : "#9E9E9E"} 
                style={styles.sessionStatusIcon}
              />
              <Text style={styles.sessionCountText}>
                {todaySessionCount > 0
                  ? `You have ${todaySessionCount} session${todaySessionCount > 1 ? 's' : ''} for today`
                  : 'You have no sessions scheduled for today'}
              </Text>
            </View>
          )}
          <Button 
            mode="contained" 
            style={styles.viewAllButton}
            buttonColor="#9C27B0"
            textColor="#FFFFFF"
            onPress={() => navigation.navigate('Schedule', { screen: 'ManageSessions' })}
            disabled={loadingSessions}
          >
            View All Sessions
          </Button>
        </Card.Content>
      </Card>
    );
  }, [loadingSessions, todaySessionCount, navigation]);

  // Safely determine profile image source
  const getProfileImageSource = () => {
    // Check if user has a photoURL and it's a valid URL
    if (user?.photoURL && 
        isValidImageUrl(user.photoURL) && 
        !avatarError) {
      return { uri: user.photoURL };
    }
    // Fallback to default avatar
    return require('../../../assets/icon.png');
  };

  useEffect(() => {
    // Reset avatar error state when user profile changes
    setAvatarError(false);
  }, [user?.photoURL]);

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Not logged in</Text>
      </View>
    );
  }

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#9C27B0" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
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
                <Image
                  source={getProfileImageSource()}
                  style={styles.avatarImage}
                  onError={() => setAvatarError(true)}
                />
              </View>
              <Text style={styles.name}>{user.fullName || user.displayName || 'Tutor'}</Text>
              <Text style={styles.email}>{user.email || ''}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>Tutor</Text>
              </View>
              
              <View style={styles.ratingContainer}>
                <MaterialIcons name="star" size={20} color="#F59E0B" />
                <Text style={styles.rating}>{rating}</Text>
                <Text style={styles.ratingText}>{user?.totalReviews > 0 ? `(${user?.totalReviews} reviews)` : '(No reviews yet)'}</Text>
              </View>
              
              <Button 
                mode="contained" 
                style={styles.editProfileButton}
                buttonColor="#FFFFFF"
                textColor="#9C27B0"
                icon="account-edit"
                onPress={() => navigation.navigate('EditProfile')}
              >
                Edit Profile
              </Button>
            </View>
          </LinearGradient>
        </View>

        {teachingStatsSection}

        <Card style={styles.infoCard} mode="elevated">
          <Card.Content>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Teaching Subjects</Text>
              <MaterialIcons name="category" size={24} color="#9C27B0" />
            </View>
            {subjects.length > 0 ? (
              <View style={styles.subjectsContainer}>
                {subjectChips}
              </View>
            ) : (
              <View style={styles.emptyStateContainer}>
                <MaterialIcons name="category" size={40} color="#9E9E9E" />
                <Text style={styles.emptyText}>
                  You haven't added any subjects yet. Add subjects to be visible to students.
                </Text>
              </View>
            )}
            <Button 
              mode="outlined" 
              style={styles.editButton}
              textColor="#9C27B0"
              icon={subjects.length > 0 ? "pencil" : "plus"}
              onPress={() => navigation.navigate('EditSubjects')}
            >
              {subjects.length > 0 ? 'Edit Subjects' : 'Add Subjects'}
            </Button>
          </Card.Content>
        </Card>

        {upcomingSessionsSection}

        <View style={styles.actionsContainer}>
          <Button
            mode="outlined"
            style={styles.reportIssueButton}
            icon="alert-circle-outline"
            onPress={() => navigation.navigate('ReportIssue')}
            textColor="#9C27B0"
          >
            Report an Issue
          </Button>
          
          <Button
            mode="outlined"
            icon="logout-variant"
            style={styles.logoutButton}
            textColor="#F44336"
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
    backgroundColor: '#F8FAFC',
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
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 15,
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    backgroundColor: '#FFFFFF',
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
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#FFFFFF30',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  rating: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 6,
    marginRight: 6,
  },
  ratingText: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
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
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    marginBottom: 10,
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
  subjectsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  subjectChip: {
    margin: 4,
    backgroundColor: '#F3E5F5',
  },
  editButton: {
    marginTop: 8,
    borderColor: '#9C27B0',
  },
  sessionStatusContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  sessionStatusIcon: {
    marginBottom: 8,
  },
  sessionCountText: {
    fontSize: 16,
    color: '#1F2937',
    textAlign: 'center',
  },
  viewAllButton: {
    marginTop: 12,
    elevation: 2,
  },
  actionsContainer: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  reportIssueButton: {
    marginBottom: 8,
    borderColor: '#9C27B0',
    borderRadius: 8,
  },
  logoutButton: {
    borderColor: '#F44336',
    borderRadius: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingSessionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginLeft: 10,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 12,
    lineHeight: 22,
  },
});

export default TutorProfileScreen; 