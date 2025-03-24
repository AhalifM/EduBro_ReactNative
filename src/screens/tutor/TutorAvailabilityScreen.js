import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Title, Paragraph, useTheme } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import TutorCalendar from '../../components/TutorCalendar';
import { getUserSessions } from '../../utils/tutorUtils';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

const TutorAvailabilityScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [todaySessions, setTodaySessions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
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

  useFocusEffect(
    useCallback(() => {
      fetchTodaySessions();
    }, [fetchTodaySessions])
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
      <View style={styles.sessionsContainer}>
        {renderTodaySessions()}
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
    backgroundColor: '#f5f5f5',
  },
  sessionsContainer: {
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
    marginBottom: 12,
    elevation: 2,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  subject: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  time: {
    fontSize: 16,
    color: '#666',
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
  loadingText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    padding: 20,
  },
  noSessionsText: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
});

export default TutorAvailabilityScreen; 