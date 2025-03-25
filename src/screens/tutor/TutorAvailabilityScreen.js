import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Text, Card, Title, Paragraph, useTheme, Button, Badge } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import TutorCalendar from '../../components/TutorCalendar';
import { getUserSessions } from '../../utils/tutorUtils';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

const TutorAvailabilityScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [todaySessions, setTodaySessions] = useState([]);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const theme = useTheme();

  const fetchTodaySessions = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      // Don't set loading on subsequent refreshes to avoid flickering
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
    if (!user?.uid) return;
    
    try {
      // Don't set loading on subsequent refreshes to avoid flickering
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

  // Use useFocusEffect for more efficient data fetching
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      
      const fetchData = async () => {
        if (isMounted) {
          // Fetch data in parallel
          await Promise.all([
            fetchTodaySessions(),
            fetchPendingRequests()
          ]);
        }
      };
      
      fetchData();
      
      return () => {
        isMounted = false;
      };
    }, [fetchTodaySessions, fetchPendingRequests])
  );

  // Memoize session cards to prevent unnecessary re-renders
  const sessionCards = useMemo(() => {
    return todaySessions.map((session) => (
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
    ));
  }, [todaySessions]);

  // Memoize today's sessions section
  const todaySessionsSection = useMemo(() => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading sessions...</Text>
        </View>
      );
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
        {sessionCards}
      </View>
    );
  }, [isLoading, todaySessions, sessionCards, theme.colors.primary]);

  // Memoize session requests section
  const sessionRequestsSection = useMemo(() => {
    return (
      <Card style={styles.cardContainer}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Title>Session Requests</Title>
            {pendingRequestsCount > 0 && (
              <Badge style={styles.requestBadge}>{pendingRequestsCount}</Badge>
            )}
          </View>
          
          {isLoadingRequests ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Loading requests...</Text>
            </View>
          ) : (
            <Paragraph style={styles.requestsText}>
              {pendingRequestsCount > 0 ? 
               `You have ${pendingRequestsCount} pending session request${pendingRequestsCount > 1 ? 's' : ''}` : 
               'No pending session requests'}
            </Paragraph>
          )}
          
          <Button
            mode="contained"
            onPress={() => navigation.navigate('SessionRequests')}
            style={styles.requestsButton}
            icon="calendar-check"
            disabled={isLoadingRequests}
          >
            {pendingRequestsCount > 0 ? 'View Requests' : 'Check Requests'}
          </Button>
        </Card.Content>
      </Card>
    );
  }, [isLoadingRequests, pendingRequestsCount, navigation, theme.colors.primary]);

  // Memoize today's sessions card
  const todaySessionsCard = useMemo(() => {
    return (
      <Card style={styles.cardContainer}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Title>Today's Sessions</Title>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('ManageSessions')}
              style={styles.viewAllButton}
              disabled={isLoading}
            >
              View All
            </Button>
          </View>
          
          {todaySessionsSection}
        </Card.Content>
      </Card>
    );
  }, [todaySessionsSection, navigation, isLoading]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Tutor Dashboard</Text>
        </View>

        {todaySessionsCard}
        {sessionRequestsSection}

        <TutorCalendar navigation={navigation} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  contentContainer: {
    paddingBottom: 20,
  },
  header: {
    backgroundColor: '#2196F3',
    padding: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  cardContainer: {
    margin: 16,
    marginBottom: 8,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  sessionCard: {
    marginVertical: 8,
    borderRadius: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  viewAllButton: {
    height: 40,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  subject: {
    fontSize: 18,
    fontWeight: '600',
  },
  time: {
    fontSize: 14,
    color: '#666',
  },
  detailsContainer: {
    marginTop: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  noSessionsText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 12,
    color: '#333',
  },
  requestsText: {
    marginVertical: 10,
    fontSize: 16,
    color: '#666',
  },
  requestsButton: {
    marginTop: 8,
  },
  requestBadge: {
    backgroundColor: '#f44336',
    color: 'white',
  },
});

export default TutorAvailabilityScreen; 