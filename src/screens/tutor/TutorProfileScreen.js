import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, Card, Avatar, useTheme, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { getAllSubjects, getUserSessions } from '../../utils/tutorUtils';
import { logoutUser } from '../../utils/auth';
import { CommonActions } from '@react-navigation/native';

const TutorProfileScreen = ({ navigation }) => {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState([]);
  const [todaySessionCount, setTodaySessionCount] = useState(0);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const theme = useTheme();

  // Sample values for stats
  const rating = user?.rating || 'New';
  const sessionsCompleted = 0;
  const studentsHelped = 0;

  const fetchData = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      setLoading(true);
      setLoadingSessions(true);
      
      // Fetch subjects
      const subjectsResult = await getAllSubjects();
      if (subjectsResult.success) {
        const userSubjects = subjectsResult.subjects.filter(
          subject => user.subjects?.includes(subject.id)
        );
        setSubjects(userSubjects);
      }
      
      // Fetch sessions
      const sessionsResult = await getUserSessions(user.uid, 'tutor');
      if (sessionsResult.success) {
        const today = new Date().toISOString().split('T')[0];
        const todayCount = sessionsResult.sessions.filter(
          session => session.date === today && session.status === 'confirmed'
        ).length;
        setTodaySessionCount(todayCount);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setLoadingSessions(false);
    }
  }, [user?.uid]);

  React.useEffect(() => {
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

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Not logged in</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
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
            <Text style={styles.ratingText}>Tutor Rating</Text>
          </View>
          
          <Button 
            mode="outlined" 
            style={styles.editProfileButton}
            onPress={() => navigation.navigate('EditProfile')}
          >
            Edit Profile
          </Button>
        </View>

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

        <Card style={styles.infoCard}>
          <Card.Content>
            <Text style={styles.cardTitle}>Upcoming Teaching Subjects</Text>
            {subjects.length > 0 ? (
              <View style={styles.subjectsContainer}>
                {subjects.map((subject) => (
                  <Chip 
                    key={`${subject.id}`}
                    style={styles.subjectChip}
                    textStyle={{ color: theme.colors.primary }}
                  >
                    {subject.name || 'Unknown Subject'}
                  </Chip>
                ))}
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

        <Card style={styles.infoCard}>
          <Card.Content>
            <Text style={styles.cardTitle}>Upcoming Sessions</Text>
            <Text style={styles.sessionCountText}>
              {loadingSessions ? 'Loading sessions...' : (
                todaySessionCount > 0
                  ? `You have ${todaySessionCount} session${todaySessionCount > 1 ? 's' : ''} for today`
                  : 'You have no sessions scheduled for today'
              )}
            </Text>
            <Button 
              mode="contained" 
              style={styles.viewAllButton}
              onPress={() => navigation.navigate('Schedule', { screen: 'ManageSessions' })}
            >
              View All Sessions
            </Button>
          </Card.Content>
        </Card>

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
    backgroundColor: '#f5f5f5',
  },
  header: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
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
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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