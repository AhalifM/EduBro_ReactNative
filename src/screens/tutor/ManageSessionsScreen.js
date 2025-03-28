import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { Text, Button, Card, useTheme, ActivityIndicator, List, FAB } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { getUserSessions, updateSessionStatus } from '../../utils/tutorUtils';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

const ManageSessionsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [processingSession, setProcessingSession] = useState(null);

  useEffect(() => {
    fetchSessions();
    
    // Add listener to refresh on focus
    const unsubscribe = navigation.addListener('focus', () => {
      fetchSessions();
    });
    
    return unsubscribe;
  }, [navigation]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const result = await getUserSessions(user.uid, 'tutor');
      
      if (result.success) {
        // Sort sessions by date, most recent first (descending order)
        const sortedSessions = result.sessions.sort((a, b) => {
          // Ensure session data exists before sorting
          if (!a || !b || !a.date || !b.date || !a.startTime || !b.startTime) {
            return 0;
          }
          const dateA = new Date(`${a.date}T${a.startTime}`);
          const dateB = new Date(`${b.date}T${b.startTime}`);
          return dateB - dateA; // Changed order to sort from newest to oldest
        });
        
        setSessions(sortedSessions);
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
    // Validate session data exists
    if (!session || !session.id || !session.date) {
      return null;
    }

    const sessionDate = new Date(session.date);
    const formattedDate = sessionDate.toLocaleDateString();
    const isProcessing = processingSession === session.id;
    
    const getStatusColor = (status) => {
      switch(status) {
        case 'completed': return '#4CAF50';
        case 'cancelled': return '#F44336';
        case 'confirmed': return '#9C27B0';
        case 'pending': return '#FF9800';
        default: return '#9C27B0';
      }
    };
    
    const getStatusIcon = (status) => {
      switch(status) {
        case 'completed': return 'check-circle';
        case 'cancelled': return 'cancel';
        case 'confirmed': return 'event-available';
        case 'pending': return 'schedule';
        default: return 'help';
      }
    };
    
    return (
      <Card style={styles.sessionCard} key={session.id}>
        <Card.Content>
          <View style={styles.sessionHeader}>
            <Text style={styles.sessionDate}>{formattedDate}</Text>
            <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(session.status)}15` }]}>
              <MaterialIcons 
                name={getStatusIcon(session.status)} 
                size={16} 
                color={getStatusColor(session.status)} 
                style={styles.statusIcon}
              />
              <Text style={[styles.sessionStatus, { color: getStatusColor(session.status) }]}>
                {session.status ? session.status.charAt(0).toUpperCase() + session.status.slice(1) : 'Unknown'}
              </Text>
            </View>
          </View>
          
          <View style={styles.sessionDetails}>
            <View style={styles.detailRow}>
              <MaterialIcons name="person" size={20} color="#666" style={styles.detailIcon} />
              <Text style={styles.detailText}>{session.studentName || 'Unknown Student'}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <MaterialIcons name="schedule" size={20} color="#666" style={styles.detailIcon} />
              <Text style={styles.detailText}>
                {session.startTime && session.endTime ? `${session.startTime} - ${session.endTime}` : 'Time not specified'}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <MaterialIcons name="school" size={20} color="#666" style={styles.detailIcon} />
              <Text style={styles.detailText}>{session.subject || 'Subject not specified'}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <MaterialIcons name="attach-money" size={20} color="#666" style={styles.detailIcon} />
              <Text style={styles.detailText}>{session.hourlyRate ? `$${session.hourlyRate}/hr` : 'Rate not specified'}</Text>
            </View>
          </View>
          
          {session.status === 'pending' && (
            <View style={styles.actionButtons}>
              <Button 
                mode="contained" 
                onPress={() => handleAcceptSession(session.id)}
                style={styles.acceptButton}
                buttonColor="#9C27B0"
                loading={isProcessing}
                disabled={isProcessing}
                icon="check"
              >
                Accept
              </Button>
              <Button 
                mode="outlined" 
                onPress={() => handleDeclineSession(session.id)}
                style={styles.declineButton}
                textColor="#F43F5E"
                loading={isProcessing}
                disabled={isProcessing}
                icon="close"
              >
                Decline
              </Button>
            </View>
          )}
        </Card.Content>
      </Card>
    );
  };

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
              <Text style={styles.headerTitle}>Manage Sessions</Text>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </View>
      
      <View style={styles.container}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#9C27B0" />
            <Text style={styles.loadingText}>Loading sessions...</Text>
          </View>
        ) : (
          <>
            {!sessions || sessions.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="event-busy" size={48} color="#9E9E9E" />
                <Text style={styles.emptyText}>No sessions found</Text>
                <Text style={styles.emptySubtext}>
                  Your upcoming sessions will appear here
                </Text>
              </View>
            ) : (
              <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                {sessions.map(session => session ? renderSessionItem(session) : null)}
              </ScrollView>
            )}
          </>
        )}
        
        <FAB
          style={styles.fab}
          icon="refresh"
          color="#FFFFFF"
          onPress={fetchSessions}
        />
      </View>
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
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6B7280',
  },
  sessionCard: {
    marginBottom: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sessionDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusIcon: {
    marginRight: 4,
  },
  sessionStatus: {
    fontSize: 14,
    fontWeight: '600',
  },
  sessionDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailIcon: {
    marginRight: 10,
  },
  detailText: {
    fontSize: 15,
    color: '#4B5563',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  acceptButton: {
    flex: 1,
    marginRight: 8,
    borderRadius: 8,
    elevation: 0,
  },
  declineButton: {
    flex: 1,
    marginLeft: 8,
    borderRadius: 8,
    borderColor: '#F43F5E',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4B5563',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#9C27B0',
  },
});

export default ManageSessionsScreen; 