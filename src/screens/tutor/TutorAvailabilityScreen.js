import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { Text, Card, Title, Paragraph, useTheme, Button, Badge, Divider } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import TutorCalendar from '../../components/TutorCalendar';
import { getUserSessions } from '../../utils/tutorUtils';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

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
      <Card key={session.id} style={styles.sessionCard} mode="elevated">
        <Card.Content>
          <View style={styles.sessionHeader}>
            <Title style={styles.subject}>{session.subject}</Title>
            <View style={styles.timeContainer}>
              <MaterialIcons name="access-time" size={18} color="#9C27B0" style={styles.timeIcon} />
              <Text style={styles.time}>
                {session.startTime} - {session.endTime}
              </Text>
            </View>
          </View>
          
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <MaterialIcons name="person" size={20} color="#9C27B0" />
              <Paragraph style={styles.detailText}>
                {session.studentName}
              </Paragraph>
            </View>
            
            {session.studentEmail && (
              <View style={styles.detailRow}>
                <MaterialIcons name="email" size={20} color="#9C27B0" />
                <Paragraph style={styles.detailText}>
                  {session.studentEmail}
                </Paragraph>
              </View>
            )}
            
            <View style={styles.detailRow}>
              <MaterialIcons name="attach-money" size={20} color="#9C27B0" />
              <Paragraph style={styles.detailText}>
                ${session.hourlyRate}/hr
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
          <ActivityIndicator size="small" color="#9C27B0" />
          <Text style={styles.loadingText}>Loading sessions...</Text>
        </View>
      );
    }

    if (todaySessions.length === 0) {
      return (
        <View style={styles.emptyStateContainer}>
          <MaterialIcons name="event-busy" size={40} color="#6B7280" />
          <Text style={styles.noSessionsText}>
            You have no sessions scheduled for today
          </Text>
        </View>
      );
    }

    return (
      <View>
        <Text style={styles.sectionSubtitle}>
          {todaySessions.length} session{todaySessions.length !== 1 ? 's' : ''} scheduled today
        </Text>
        {sessionCards}
      </View>
    );
  }, [isLoading, todaySessions, sessionCards]);

  // Memoize session requests section
  const sessionRequestsSection = useMemo(() => {
    return (
      <Card style={styles.cardContainer} mode="elevated">
        <LinearGradient
          colors={['#F3E5F5', '#FCE4EC']}
          style={styles.cardGradient}
        >
          <Card.Content>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleContainer}>
                <MaterialIcons name="notifications" size={24} color="#9C27B0" style={styles.cardIcon} />
                <Title style={styles.cardTitle}>Session Requests</Title>
              </View>
              {pendingRequestsCount > 0 && (
                <Badge style={styles.requestBadge} size={24}>{pendingRequestsCount}</Badge>
              )}
            </View>
            
            {isLoadingRequests ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#9C27B0" />
                <Text style={styles.loadingText}>Loading requests...</Text>
              </View>
            ) : (
              <View style={styles.requestsContainer}>
                <MaterialIcons 
                  name={pendingRequestsCount > 0 ? "mark-email-unread" : "mark-email-read"} 
                  size={36} 
                  color={pendingRequestsCount > 0 ? "#E91E63" : "#6B7280"} 
                  style={styles.requestsIcon}
                />
                <Paragraph style={styles.requestsText}>
                  {pendingRequestsCount > 0 ? 
                   `You have ${pendingRequestsCount} pending session request${pendingRequestsCount > 1 ? 's' : ''}` : 
                   'No pending session requests'}
                </Paragraph>
              </View>
            )}
            
            <Button
              mode="contained"
              onPress={() => navigation.navigate('SessionRequests')}
              style={styles.requestsButton}
              buttonColor="#9C27B0"
              icon="calendar-check"
              disabled={isLoadingRequests}
            >
              {pendingRequestsCount > 0 ? 'View Requests' : 'Check Requests'}
            </Button>
          </Card.Content>
        </LinearGradient>
      </Card>
    );
  }, [isLoadingRequests, pendingRequestsCount, navigation]);

  // Memoize today's sessions card
  const todaySessionsCard = useMemo(() => {
    return (
      <Card style={styles.cardContainer} mode="elevated">
        <LinearGradient
          colors={['#F3E5F5', '#FCE4EC']}
          style={styles.cardGradient}
        >
          <Card.Content>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleContainer}>
                <MaterialIcons name="today" size={24} color="#9C27B0" style={styles.cardIcon} />
                <Title style={styles.cardTitle}>Today's Sessions</Title>
              </View>
              <Button
                mode="contained"
                onPress={() => navigation.navigate('ManageSessions')}
                style={styles.viewAllButton}
                buttonColor="#9C27B0"
                disabled={isLoading}
                labelStyle={styles.buttonLabel}
              >
                View All
              </Button>
            </View>
            
            <Divider style={styles.divider} />
            
            {todaySessionsSection}
          </Card.Content>
        </LinearGradient>
      </Card>
    );
  }, [todaySessionsSection, navigation, isLoading]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <StatusBar style="light" />
      
      <View style={styles.headerContainer}>
        <LinearGradient
          colors={['#9C27B0', '#E91E63']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0.7 }}
          style={styles.headerGradient}
        >
          <SafeAreaView edges={['top']} style={styles.safeAreaTop}>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Set Availability</Text>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </View>
      
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Tutor Dashboard</Text>
        
        {sessionRequestsSection}
        {todaySessionsCard}
        
        <View style={styles.calendarContainer}>
          <Text style={styles.sectionTitle}>Manage Your Schedule</Text>
          <Text style={styles.sectionSubtitle}>
            Set your availability by selecting dates and time slots
          </Text>
          <TutorCalendar navigation={navigation} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  safeAreaTop: {
    width: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  contentContainer: {
    paddingBottom: 30,
  },
  headerContainer: {
    overflow: 'hidden',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 4,
    shadowColor: '#9C27B0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  headerGradient: {
    width: '100%',
  },
  headerContent: {
    padding: 20,
    paddingTop: Platform.OS === 'android' ? 16 : 0,
    paddingBottom: 24,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 24,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  cardContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardGradient: {
    width: '100%',
    padding: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 4,
  },
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  divider: {
    height: 1,
    backgroundColor: '#E9D5F0',
    marginVertical: 16,
  },
  sessionCard: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#9C27B0',
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  subject: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E5F5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  timeIcon: {
    marginRight: 6,
  },
  time: {
    fontSize: 14,
    color: '#9C27B0',
    fontWeight: '500',
  },
  detailsContainer: {
    marginTop: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailText: {
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 12,
    flex: 1,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginLeft: 12,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  noSessionsText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 16,
  },
  viewAllButton: {
    borderRadius: 8,
    elevation: 0,
    paddingHorizontal: 16,
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  requestsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  requestsIcon: {
    marginBottom: 12,
  },
  requestsText: {
    fontSize: 16,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 12,
  },
  requestBadge: {
    backgroundColor: '#E91E63',
  },
  requestsButton: {
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 8,
    elevation: 0,
    paddingVertical: 8,
  },
  calendarContainer: {
    marginTop: 16,
    paddingBottom: 20,
  },
});

export default TutorAvailabilityScreen; 