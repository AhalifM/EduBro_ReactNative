import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import TutorCalendar from '../../components/TutorCalendar';
import { getUserSessions } from '../../utils/tutorUtils';

const TutorAvailabilityScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      fetchUpcomingSessions();
    }
    
    // Refresh sessions when screen is focused
    const unsubscribe = navigation.addListener('focus', () => {
      if (user?.uid) {
        fetchUpcomingSessions();
      }
    });
    
    return unsubscribe;
  }, [navigation, user]);

  const fetchUpcomingSessions = async () => {
    try {
      setIsLoading(true);
      
      const result = await getUserSessions(user.uid, 'tutor', 'confirmed');
      
      if (result.success) {
        // Sort by date and time
        const sortedSessions = result.sessions.sort((a, b) => {
          const dateA = new Date(`${a.date}T${a.startTime}`);
          const dateB = new Date(`${b.date}T${b.startTime}`);
          return dateA - dateB;
        });
        
        // Get only future sessions (today or later)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const futureSessions = sortedSessions.filter(session => {
          const sessionDate = new Date(session.date);
          return sessionDate >= today;
        });
        
        setUpcomingSessions(futureSessions.slice(0, 5)); // Show only next 5 sessions
      }
    } catch (error) {
      console.error('Error fetching upcoming sessions:', error);
      Alert.alert('Error', 'Failed to load upcoming sessions');
    } finally {
      setIsLoading(false);
    }
  };

  const renderUpcomingSessions = () => {
    if (upcomingSessions.length === 0) {
      return (
        <Text style={styles.noSessionsText}>
          You have no upcoming sessions.
        </Text>
      );
    }

    return upcomingSessions.map(session => (
      <View key={session.id} style={styles.sessionCard}>
        <Text style={styles.sessionSubject}>{session.subject}</Text>
        <Text style={styles.sessionDate}>{session.date}</Text>
        <Text style={styles.sessionTime}>
          {session.startTime} - {session.endTime}
        </Text>
        <Text style={styles.sessionStudent}>
          Student: {session.studentName || 'Unknown'}
        </Text>
      </View>
    ));
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.upcomingSessionsContainer}>
        <Text style={styles.sectionTitle}>Upcoming Sessions</Text>
        {isLoading ? (
          <Text style={styles.loadingText}>Loading sessions...</Text>
        ) : (
          renderUpcomingSessions()
        )}
      </View>
      
      <View style={styles.calendarContainer}>
        <TutorCalendar />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  upcomingSessionsContainer: {
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  calendarContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  sessionCard: {
    backgroundColor: '#f0f7ff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  sessionSubject: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  sessionDate: {
    fontSize: 16,
    color: '#555',
    marginBottom: 4,
  },
  sessionTime: {
    fontSize: 16,
    color: '#555',
    marginBottom: 4,
  },
  sessionStudent: {
    fontSize: 16,
    color: '#555',
  },
  noSessionsText: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  loadingText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    padding: 20,
  },
});

export default TutorAvailabilityScreen; 