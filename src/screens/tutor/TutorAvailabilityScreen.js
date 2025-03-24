import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Title, Paragraph, useTheme, Button, Badge } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import TutorCalendar from '../../components/TutorCalendar';
import { getUserSessions } from '../../utils/tutorUtils';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

const TutorAvailabilityScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [todaySessions, setTodaySessions] = useState([]);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const theme = useTheme();

  const fetchTodaySessions = useCallback(async () => {
    if (!user?.uid || isLoading) return;
    
    try {
      setIsLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const result = await getUserSessions(user.uid, 'tutor');
      
      if (result.success) {
        const todaysSessions = result.sessions
          .filter(session => session.date === today && session.status === 'confirmed')
          .sort((a, b) => {
            const timeA = a.startTime.replace(':', '');
            const timeB = b.startTime.replace(':', '');
            return timeA - timeB;
          });
        setTodaySessions(todaysSessions);
      }
    } catch (error) {
      console.error('Error fetching today\'s sessions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid]);

  const fetchPendingRequests = useCallback(async () => {
    if (!user?.uid || isLoadingRequests) return;
    
    try {
      setIsLoadingRequests(true);
      const result = await getUserSessions(user.uid, 'tutor', 'pending');
      
      if (result.success) {
        setPendingRequestsCount(result.sessions.length);
      }
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    } finally {
      setIsLoadingRequests(false);
    }
  }, [user?.uid]);

  useFocusEffect(
    useCallback(() => {
      fetchTodaySessions();
      fetchPendingRequests();
    }, [fetchTodaySessions, fetchPendingRequests])
  );

  const renderSessionCard = (session) => {
    return (
      <Card key={session.id} style={styles.sessionCard}>
        <Card.Content>
          <View style={styles.sessionHeader}>
            <Title style={styles.subject}>{session.subject}</Title>
            <Text style={styles.time}>
              {session.startTime} - {session.endTime}
            </Text>
          </View>
          
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <MaterialIcons name="person" size={20} color="#666" />
              <Paragraph style={styles.detailText}>
                Student: {session.studentName}
              </Paragraph>
            </View>
            
            {session.studentEmail && (
              <View style={styles.detailRow}>
                <MaterialIcons name="email" size={20} color="#666" />
                <Paragraph style={styles.detailText}>
                  {session.studentEmail}
                </Paragraph>
              </View>
            )}
            
            <View style={styles.detailRow}>
              <MaterialIcons name="attach-money" size={20} color="#666" />
              <Paragraph style={styles.detailText}>
                Rate: ${session.hourlyRate}/hr
              </Paragraph>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderTodaySessions = () => {
    if (isLoading) {
      return <Text style={styles.loadingText}>Loading sessions...</Text>;
    }

    if (todaySessions.length === 0) {
      return (
        <Text style={styles.noSessionsText}>
          You have no sessions scheduled for today
        </Text>
      );
    }

    return (
      <View>
        <Text style={styles.sectionTitle}>
          Today's Sessions ({todaySessions.length})
        </Text>
        {todaySessions.map(renderSessionCard)}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tutor Dashboard</Text>
      </View>

      <Card style={styles.sessionCard}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Title>Today's Sessions</Title>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('ManageSessions')}
              style={styles.viewAllButton}
            >
              View All
            </Button>
          </View>
          
          {renderTodaySessions()}
        </Card.Content>
      </Card>

      <Card style={styles.sessionCard}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Title>Session Requests</Title>
            {pendingRequestsCount > 0 && (
              <Badge style={styles.requestBadge}>{pendingRequestsCount}</Badge>
            )}
          </View>
          
          <Paragraph style={styles.requestsText}>
            {isLoadingRequests ? 'Loading session requests...' : 
             pendingRequestsCount > 0 ? 
             `You have ${pendingRequestsCount} pending session request${pendingRequestsCount > 1 ? 's' : ''}` : 
             'No pending session requests'}
          </Paragraph>
          
          <Button
            mode="contained"
            onPress={() => navigation.navigate('SessionRequests')}
            style={styles.requestsButton}
            icon="calendar-check"
          >
            {pendingRequestsCount > 0 ? 'View Requests' : 'Check Requests'}
          </Button>
        </Card.Content>
      </Card>

      <TutorCalendar navigation={navigation} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  sessionCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  viewAllButton: {
    height: 36,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  sessionItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
    paddingLeft: 10,
    marginBottom: 12,
  },
  sessionTime: {
    fontSize: 14,
    color: '#666',
  },
  sessionStudent: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  sessionSubject: {
    fontSize: 14,
    color: '#666',
  },
  noSessionsText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    padding: 20,
  },
  requestsText: {
    fontSize: 16,
    marginBottom: 15,
  },
  requestsButton: {
    alignSelf: 'flex-start',
  },
  requestBadge: {
    backgroundColor: '#e53935',
    color: 'white',
  },
  detailsContainer: {
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
});

export default TutorAvailabilityScreen; 