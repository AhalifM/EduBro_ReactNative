import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Modal, TouchableOpacity } from 'react-native';
import { Text, Button, Card, useTheme, ActivityIndicator, List, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { getUserSessions, updateSessionStatus, rescheduleSession } from '../../utils/tutorUtils';
import { processRefund } from '../../utils/paymentUtils';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

const SessionRequestsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [pendingSessions, setPendingSessions] = useState([]);
  
  // Reschedule modal state
  const [isRescheduleModalVisible, setIsRescheduleModalVisible] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [newDate, setNewDate] = useState(new Date());
  const [newStartTime, setNewStartTime] = useState('10:00');
  const [newEndTime, setNewEndTime] = useState('11:00');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [isSubmittingReschedule, setIsSubmittingReschedule] = useState(false);

  useEffect(() => {
    fetchPendingSessions();
    
    // Refresh when screen is focused
    const unsubscribe = navigation.addListener('focus', () => {
      fetchPendingSessions();
    });
    
    return unsubscribe;
  }, [navigation]);

  const fetchPendingSessions = async () => {
    try {
      setLoading(true);
      const result = await getUserSessions(user.uid, 'tutor', 'pending');
      
      if (result.success) {
        setPendingSessions(result.sessions);
      } else {
        Alert.alert('Error', 'Failed to load session requests');
      }
    } catch (error) {
      console.error('Error fetching session requests:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptSession = async (sessionId) => {
    try {
      setLoading(true);
      const result = await updateSessionStatus(sessionId, 'confirmed');
      
      if (result.success) {
        Alert.alert('Success', 'Session request accepted');
        fetchPendingSessions();
      } else {
        Alert.alert('Error', result.error || 'Failed to accept session');
      }
    } catch (error) {
      console.error('Error accepting session:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDeclineSession = async (sessionId) => {
    Alert.alert(
      'Decline Session',
      'Are you sure you want to decline this session? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              // First update session status
              const updateResult = await updateSessionStatus(sessionId, 'cancelled');
              
              if (updateResult.success) {
                // Process refund
                const refundResult = await processRefund(sessionId);
                
                if (refundResult.success) {
                  Alert.alert('Success', 'Session declined and payment refunded');
                } else {
                  Alert.alert('Partial Error', 'Session declined but refund processing failed');
                }
                
                fetchPendingSessions();
              } else {
                Alert.alert('Error', updateResult.error || 'Failed to decline session');
              }
            } catch (error) {
              console.error('Error declining session:', error);
              Alert.alert('Error', 'An unexpected error occurred');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleReschedulePress = (session) => {
    setSelectedSession(session);
    setNewDate(new Date());
    setNewStartTime('10:00');
    setNewEndTime('11:00');
    setIsRescheduleModalVisible(true);
  };

  const formatDate = (dateString) => {
    const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const formatTimeForDisplay = (timeString) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setNewDate(selectedDate);
    }
  };

  const handleTimeChange = (event, selectedTime, type) => {
    if (type === 'start') {
      setShowStartTimePicker(false);
    } else {
      setShowEndTimePicker(false);
    }
    
    if (selectedTime) {
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;
      
      if (type === 'start') {
        setNewStartTime(timeString);
        
        // Automatically set end time 1 hour later
        const endTime = new Date(selectedTime);
        endTime.setHours(endTime.getHours() + 1);
        const endHours = endTime.getHours().toString().padStart(2, '0');
        const endMinutes = endTime.getMinutes().toString().padStart(2, '0');
        setNewEndTime(`${endHours}:${endMinutes}`);
      } else {
        setNewEndTime(timeString);
      }
    }
  };

  const handleSubmitReschedule = async () => {
    if (!selectedSession) return;
    
    // Validate that end time is after start time
    const [startHour, startMinute] = newStartTime.split(':').map(Number);
    const [endHour, endMinute] = newEndTime.split(':').map(Number);
    
    if (endHour < startHour || (endHour === startHour && endMinute <= startMinute)) {
      Alert.alert('Invalid Time', 'End time must be after start time');
      return;
    }
    
    try {
      setIsSubmittingReschedule(true);
      
      const dateString = newDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      
      const result = await rescheduleSession(selectedSession.id, {
        date: dateString,
        startTime: newStartTime,
        endTime: newEndTime
      });
      
      if (result.success) {
        setIsRescheduleModalVisible(false);
        Alert.alert('Success', 'Reschedule request sent to student');
        fetchPendingSessions();
      } else {
        Alert.alert('Error', result.error || 'Failed to reschedule session');
      }
    } catch (error) {
      console.error('Error rescheduling session:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsSubmittingReschedule(false);
    }
  };

  const renderSessionCard = (session) => {
    return (
      <Card style={styles.sessionCard} key={session.id}>
        <Card.Content>
          <View style={styles.sessionHeader}>
            <Text style={styles.sessionDate}>{formatDate(session.date)}</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>PENDING</Text>
            </View>
          </View>
          
          <List.Item
            title={session.studentName}
            description={`Time: ${formatTimeForDisplay(session.startTime)} - ${formatTimeForDisplay(session.endTime)}`}
            left={props => <List.Icon {...props} icon="account" />}
          />
          
          <List.Item
            title={session.subject}
            description={`$${session.hourlyRate}/hr • Total: $${session.totalAmount}`}
            left={props => <List.Icon {...props} icon="book" />}
          />
          
          <View style={styles.actionButtons}>
            <Button 
              mode="contained" 
              onPress={() => handleAcceptSession(session.id)}
              style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
              icon="check"
            >
              Accept
            </Button>
            <Button 
              mode="contained" 
              onPress={() => handleReschedulePress(session)}
              style={[styles.actionButton, { backgroundColor: theme.colors.warning || '#FFA000' }]}
              icon="calendar-clock"
            >
              Reschedule
            </Button>
            <Button 
              mode="contained" 
              onPress={() => handleDeclineSession(session.id)}
              style={[styles.actionButton, { backgroundColor: theme.colors.error }]}
              icon="close"
            >
              Decline
            </Button>
          </View>
        </Card.Content>
      </Card>
    );
  };

  if (loading && pendingSessions.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading session requests...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>Session Requests</Text>
          <Text style={styles.subtitle}>Review and respond to session requests from students</Text>
        </View>

        {pendingSessions.length > 0 ? (
          <View style={styles.sessionsContainer}>
            {pendingSessions.map(renderSessionCard)}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="event-busy" size={60} color="#ccc" />
            <Text style={styles.emptyText}>No pending session requests</Text>
            <Text style={styles.emptySubtext}>
              When students book sessions with you, they'll appear here for your approval
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Reschedule Modal */}
      <Modal
        visible={isRescheduleModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsRescheduleModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reschedule Session</Text>
            
            <Text style={styles.inputLabel}>New Date</Text>
            <TouchableOpacity 
              style={styles.dateInput}
              onPress={() => setShowDatePicker(true)}
            >
              <Text>{newDate.toLocaleDateString()}</Text>
              <MaterialIcons name="calendar-today" size={20} color="#666" />
            </TouchableOpacity>
            
            {showDatePicker && (
              <DateTimePicker
                value={newDate}
                mode="date"
                display="default"
                onChange={handleDateChange}
                minimumDate={new Date()}
              />
            )}
            
            <View style={styles.timeContainer}>
              <View style={styles.timeInput}>
                <Text style={styles.inputLabel}>Start Time</Text>
                <TouchableOpacity 
                  style={styles.timePickerButton}
                  onPress={() => setShowStartTimePicker(true)}
                >
                  <Text>{formatTimeForDisplay(newStartTime)}</Text>
                  <MaterialIcons name="access-time" size={20} color="#666" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.timeInput}>
                <Text style={styles.inputLabel}>End Time</Text>
                <TouchableOpacity 
                  style={styles.timePickerButton}
                  onPress={() => setShowEndTimePicker(true)}
                >
                  <Text>{formatTimeForDisplay(newEndTime)}</Text>
                  <MaterialIcons name="access-time" size={20} color="#666" />
                </TouchableOpacity>
              </View>
            </View>
            
            {showStartTimePicker && (
              <DateTimePicker
                value={(() => {
                  const [hours, minutes] = newStartTime.split(':');
                  const date = new Date();
                  date.setHours(parseInt(hours, 10));
                  date.setMinutes(parseInt(minutes, 10));
                  return date;
                })()}
                mode="time"
                display="default"
                onChange={(event, date) => handleTimeChange(event, date, 'start')}
              />
            )}
            
            {showEndTimePicker && (
              <DateTimePicker
                value={(() => {
                  const [hours, minutes] = newEndTime.split(':');
                  const date = new Date();
                  date.setHours(parseInt(hours, 10));
                  date.setMinutes(parseInt(minutes, 10));
                  return date;
                })()}
                mode="time"
                display="default"
                onChange={(event, date) => handleTimeChange(event, date, 'end')}
              />
            )}
            
            <View style={styles.modalActions}>
              <Button 
                mode="outlined"
                onPress={() => setIsRescheduleModalVisible(false)}
                style={styles.cancelButton}
                disabled={isSubmittingReschedule}
              >
                Cancel
              </Button>
              
              <Button 
                mode="contained"
                onPress={handleSubmitReschedule}
                style={styles.submitButton}
                loading={isSubmittingReschedule}
                disabled={isSubmittingReschedule}
              >
                Submit
              </Button>
            </View>
          </View>
        </View>
      </Modal>
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
  statusBadge: {
    backgroundColor: '#FFC107',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  statusText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
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
    padding: 60,
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 20,
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    width: '90%',
    borderRadius: 10,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#555',
  },
  dateInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 12,
    marginBottom: 20,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  timeInput: {
    width: '48%',
  },
  timePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    marginRight: 10,
  },
  submitButton: {
    flex: 1,
    marginLeft: 10,
  },
});

export default SessionRequestsScreen;
