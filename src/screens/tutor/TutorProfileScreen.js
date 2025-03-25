import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import { Text, Button, Card, Avatar, useTheme, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { getAllSubjects, getUserSessions } from '../../utils/tutorUtils';
import { logoutUser } from '../../utils/auth';
import { CommonActions } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';

const TutorProfileScreen = ({ navigation }) => {
  const { user, signOut, refreshUserData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState([]);
  const [todaySessionCount, setTodaySessionCount] = useState(0);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [studentsHelped, setStudentsHelped] = useState(0);
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
        textStyle={{ color: theme.colors.primary }}
      >
        {subject.name || 'Unknown Subject'}
      </Chip>
    ));
  }, [subjects, theme.colors.primary]);

  // Memoize the teaching stats section
  const teachingStatsSection = useMemo(() => {
    return (
      <Card style={styles.infoCard}>
        <Card.Content>
          <Text style={styles.cardTitle}>Your Teaching Stats</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{sessionsCompleted}</Text>
              <Text style={styles.statLabel}>Sessions</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{studentsHelped}</Text>
              <Text style={styles.statLabel}>Students</Text>
            </View>
            <View style={styles.statItem}>
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
      <Card style={styles.infoCard}>
        <Card.Content>
          <Text style={styles.cardTitle}>Upcoming Sessions</Text>
          {loadingSessions ? (
            <View style={styles.loadingSessionContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Loading sessions...</Text>
            </View>
          ) : (
            <Text style={styles.sessionCountText}>
              {todaySessionCount > 0
                ? `You have ${todaySessionCount} session${todaySessionCount > 1 ? 's' : ''} for today`
                : 'You have no sessions scheduled for today'}
            </Text>
          )}
          <Button 
            mode="contained" 
            style={styles.viewAllButton}
            onPress={() => navigation.navigate('Schedule', { screen: 'ManageSessions' })}
            disabled={loadingSessions}
          >
            View All Sessions
          </Button>
        </Card.Content>
      </Card>
    );
  }, [loadingSessions, todaySessionCount, navigation, theme.colors.primary]);

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
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
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
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Avatar.Image
            size={100}
            source={user.photoURL ? { uri: user.photoURL } : require('../../../assets/icon.png')}
            style={styles.avatar}
          />
          <Text style={styles.name}>{user.fullName || user.displayName || 'Tutor'}</Text>
          <Text style={styles.email}>{user.email || ''}</Text>
          <Text style={styles.role}>Tutor</Text>
          
          <View style={styles.ratingContainer}>
            <Text style={styles.rating}>{rating} ★</Text>
            <Text style={styles.ratingText}>Tutor Rating {user?.totalReviews > 0 ? `(${user?.totalReviews} reviews)` : ''}</Text>
          </View>
          
          <Button 
            mode="outlined" 
            style={styles.editProfileButton}
            onPress={() => navigation.navigate('EditProfile')}
          >
            Edit Profile
          </Button>
        </View>

        {teachingStatsSection}

        <Card style={styles.infoCard}>
          <Card.Content>
            <Text style={styles.cardTitle}>Upcoming Teaching Subjects</Text>
            {subjects.length > 0 ? (
              <View style={styles.subjectsContainer}>
                {subjectChips}
              </View>
            ) : (
              <Text style={styles.emptyText}>
                You haven't added any subjects yet. Add subjects to be visible to students.
              </Text>
            )}
            <Button 
              mode="outlined" 
              style={styles.editButton}
              onPress={() => navigation.navigate('EditSubjects')}
            >
              {subjects.length > 0 ? 'Edit Subjects' : 'Add Subjects'}
            </Button>
          </Card.Content>
        </Card>

        {upcomingSessionsSection}

        <Button 
          mode="outlined" 
          style={styles.logoutButton}
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
    backgroundColor: '#f8f8f8',
  },
  header: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    margin: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
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
    fontSize: 16,
    color: '#2196F3',
    marginBottom: 10,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  rating: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFC107',
    marginRight: 5,
  },
  ratingText: {
    fontSize: 16,
    color: '#666',
  },
  infoCard: {
    margin: 10,
    elevation: 2,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  subjectsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  subjectChip: {
    margin: 4,
    backgroundColor: '#E3F2FD',
  },
  editButton: {
    marginTop: 10,
  },
  sessionCountText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginVertical: 16,
  },
  viewAllButton: {
    marginTop: 8,
  },
  logoutButton: {
    margin: 10,
    marginTop: 20,
    marginBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingSessionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginLeft: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
  },
  editProfileButton: {
    marginTop: 10,
  },
});

export default TutorProfileScreen; 