import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, Card, useTheme, ActivityIndicator, List, FAB } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { getUserSessions, updateSessionStatus } from '../../utils/tutorUtils';

const ManageSessionsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [processingSession, setProcessingSession] = useState(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const result = await getUserSessions(user.uid, 'tutor');
      
      if (result.success) {
        setSessions(result.sessions);
      } else {
        Alert.alert('Error', 'Failed to load sessions');
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptSession = async (sessionId) => {
    try {
      setProcessingSession(sessionId);
      const result = await updateSessionStatus(sessionId, 'confirmed');
      
      if (result.success) {
        // Update the session in the local state
        setSessions(prevSessions => 
          prevSessions.map(session => 
            session.id === sessionId 
              ? { ...session, status: 'confirmed' } 
              : session
          )
        );
        Alert.alert('Success', 'Session accepted successfully');
      } else {
        Alert.alert('Error', result.error || 'Failed to accept session');
      }
    } catch (error) {
      console.error('Error accepting session:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setProcessingSession(null);
    }
  };

  const handleDeclineSession = async (sessionId) => {
    try {
      // Ask for confirmation before declining
      Alert.alert(
        'Confirm Decline',
        'Are you sure you want to decline this session?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Decline',
            style: 'destructive',
            onPress: async () => {
              setProcessingSession(sessionId);
              const result = await updateSessionStatus(sessionId, 'cancelled');
              
              if (result.success) {
                // Update the session in the local state
                setSessions(prevSessions => 
                  prevSessions.map(session => 
                    session.id === sessionId 
                      ? { ...session, status: 'cancelled' } 
                      : session
                  )
                );
                Alert.alert('Success', 'Session declined successfully');
              } else {
                Alert.alert('Error', result.error || 'Failed to decline session');
              }
              setProcessingSession(null);
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error declining session:', error);
      Alert.alert('Error', 'An unexpected error occurred');
      setProcessingSession(null);
    }
  };

  const renderSessionItem = (session) => {
    const sessionDate = new Date(session.date);
    const formattedDate = sessionDate.toLocaleDateString();
    const isProcessing = processingSession === session.id;
    
    return (
      <Card style={styles.sessionCard} key={session.id}>
        <Card.Content>
          <View style={styles.sessionHeader}>
            <Text style={styles.sessionDate}>{formattedDate}</Text>
            <Text style={[styles.sessionStatus, 
              { color: session.status === 'completed' ? theme.colors.success : 
                       session.status === 'cancelled' ? theme.colors.error :
                       session.status === 'confirmed' ? '#4CAF50' :
                       theme.colors.primary }]}>
              {session.status.toUpperCase()}
            </Text>
          </View>
          
          <List.Item
            title={session.studentName}
            description={`Time: ${session.startTime} - ${session.endTime}`}
            left={props => <List.Icon {...props} icon="account" />}
          />
          
          <List.Item
            title={session.subject}
            description={`$${session.hourlyRate}/hr`}
            left={props => <List.Icon {...props} icon="book" />}
          />
          
          {session.status === 'pending' && (
            <View style={styles.actionButtons}>
              <Button 
                mode="contained" 
                onPress={() => handleAcceptSession(session.id)}
                style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
                loading={isProcessing}
                disabled={isProcessing}
              >
                Accept
              </Button>
              <Button 
                mode="contained" 
                onPress={() => handleDeclineSession(session.id)}
                style={[styles.actionButton, { backgroundColor: theme.colors.error }]}
                loading={isProcessing}
                disabled={isProcessing}
              >
                Decline
              </Button>
            </View>
          )}
        </Card.Content>
      </Card>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading sessions...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>Your Teaching Sessions</Text>
          <Text style={styles.subtitle}>View and manage your upcoming sessions</Text>
          <Button
            mode="contained"
            icon="calendar-plus"
            onPress={() => navigation.navigate('TutorAvailability')}
            style={styles.setAvailabilityButton}
          >
            Set Availability
          </Button>
        </View>

        {sessions.length > 0 ? (
          <View style={styles.sessionsContainer}>
            {sessions.map(renderSessionItem)}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No sessions found</Text>
            <Text style={styles.emptySubtext}>
              Set your availability to start receiving bookings
            </Text>
            <Button
              mode="contained"
              icon="calendar-plus"
              onPress={() => navigation.navigate('TutorAvailability')}
              style={styles.emptyStateButton}
            >
              Set Your Availability
            </Button>
          </View>
        )}
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
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
  },
  setAvailabilityButton: {
    marginTop: 10,
  },
  sessionsContainer: {
    padding: 15,
  },
  sessionCard: {
    marginBottom: 15,
    borderRadius: 10,
    elevation: 2,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sessionDate: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  sessionStatus: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 5,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyStateButton: {
    marginTop: 10,
  },
});

export default ManageSessionsScreen; 