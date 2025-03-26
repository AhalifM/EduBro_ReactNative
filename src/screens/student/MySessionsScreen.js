import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { getUserSessions, cancelSession, submitReview, updateSessionStatus } from '../../utils/tutorUtils';
import { completeSessionAndReleasePayment, processRefund } from '../../utils/paymentUtils';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Button, Card, Title, Paragraph, useTheme, Chip } from 'react-native-paper';

const MySessionsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('upcoming'); // upcoming, past, all
  const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [rating, setRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const theme = useTheme();
  
  const fetchSessions = useCallback(async () => {
    if (!user?.uid) return;
    
    setIsLoading(true);
    try {
      const result = await getUserSessions(user.uid, 'student');
      
      if (result.success) {
        setSessions(result.sessions);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid]);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      
      const load = async () => {
        if (isMounted) {
          await fetchSessions();
        }
      };
      
      load();
      
      return () => {
        isMounted = false;
      };
    }, [fetchSessions])
  );

  const filteredSessions = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return sessions.filter(session => {
      const sessionDate = new Date(session.date);
      
      if (filter === 'upcoming') {
        return sessionDate >= today && (session.status === 'confirmed' || session.status === 'pending');
      } else if (filter === 'past') {
        return sessionDate < today || session.status === 'cancelled';
      } else {
        return true; // all
      }
    }).sort((a, b) => {
      // Sort by date
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      
      if (dateA > dateB) return filter === 'past' ? -1 : 1;
      if (dateA < dateB) return filter === 'past' ? 1 : -1;
      
      // If same date, sort by time
      const timeA = a.startTime.replace(':', '');
      const timeB = b.startTime.replace(':', '');
      return filter === 'past' ? timeB - timeA : timeA - timeB;
    });
  }, [sessions, filter]);
  
  const handleTabChange = (tabName) => {
    console.log('Changing tab to:', tabName);
    setFilter(tabName);
  };
  
  const handleCancelSession = async (session) => {
    // Check if session is within cancellation window (5 hours before)
    const sessionDateTime = new Date(`${session.date}T${session.startTime}`);
    const now = new Date();
    const hoursUntilSession = (sessionDateTime - now) / (1000 * 60 * 60);
    
    if (hoursUntilSession < 5) {
      Alert.alert(
        'Cannot Cancel Session',
        'Sessions can only be cancelled at least 5 hours before the start time.'
      );
      return;
    }
    
    Alert.alert(
      'Cancel Session',
      'Are you sure you want to cancel this session?',
      [
        {
          text: 'No',
          style: 'cancel',
        },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              setIsLoading(true);
              
              const result = await cancelSession(session.id, user.uid);
              
              if (result.success) {
                Alert.alert('Success', 'Session cancelled successfully');
                fetchSessions();
              } else {
                Alert.alert('Error', result.error || 'Failed to cancel session');
              }
            } catch (error) {
              console.error('Error cancelling session:', error);
              Alert.alert('Error', 'An unexpected error occurred');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };
  
  const handleCompleteSession = async (session) => {
    // Check if session time has passed
    const [hours, minutes] = session.startTime.split(':').map(Number);
    const sessionDateTime = new Date(session.date);
    sessionDateTime.setHours(hours, minutes, 0, 0);
    const now = new Date();
    
    if (sessionDateTime > now) {
      Alert.alert(
        'Cannot Complete Session',
        'You can only complete sessions that have already occurred.'
      );
      return;
    }
    
    Alert.alert(
      'Complete Session',
      'Are you sure you want to mark this session as completed? This will release payment to the tutor.',
      [
        {
          text: 'No',
          style: 'cancel',
        },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              setIsLoading(true);
              
              const result = await completeSessionAndReleasePayment(session.id, user.uid);
              
              if (result.success) {
                Alert.alert(
                  'Session Completed',
                  'The session has been marked as completed and payment released to the tutor.',
                  [
                    {
                      text: 'Leave a Review',
                      onPress: () => {
                        setSelectedSession(session);
                        setIsReviewModalVisible(true);
                      },
                    },
                    {
                      text: 'Later',
                      onPress: () => fetchSessions(),
                    },
                  ]
                );
              } else {
                Alert.alert('Error', result.error || 'Failed to complete session');
              }
            } catch (error) {
              console.error('Error completing session:', error);
              Alert.alert('Error', 'An unexpected error occurred');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };
  
  const handleLeaveReview = (session) => {
    setSelectedSession(session);
    setIsReviewModalVisible(true);
  };
  
  const handleAcceptReschedule = (session) => {
    Alert.alert(
      'Accept Rescheduled Session',
      'Are you sure you want to accept this rescheduled session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              setIsLoading(true);
              
              // Update the session status to confirmed
              const result = await updateSessionStatus(session.id, 'confirmed');
              
              if (result.success) {
                Alert.alert('Success', 'You have accepted the rescheduled session');
                fetchSessions();
              } else {
                Alert.alert('Error', result.error || 'Failed to accept rescheduled session');
              }
            } catch (error) {
              console.error('Error accepting rescheduled session:', error);
              Alert.alert('Error', 'An unexpected error occurred');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };
  
  const handleDeclineReschedule = (session) => {
    Alert.alert(
      'Decline Rescheduled Session',
      'Are you sure you want to decline this rescheduled session? This will cancel the booking and refund your payment.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              
              // First update session status to cancelled
              const updateResult = await updateSessionStatus(session.id, 'cancelled');
              
              if (updateResult.success) {
                // Process refund
                const refundResult = await processRefund(session.id);
                
                if (refundResult.success) {
                  Alert.alert('Success', 'You have declined the rescheduled session and your payment has been refunded');
                } else {
                  Alert.alert('Partial Error', 'Session declined but refund processing failed');
                }
                
                fetchSessions();
              } else {
                Alert.alert('Error', updateResult.error || 'Failed to decline rescheduled session');
              }
            } catch (error) {
              console.error('Error declining rescheduled session:', error);
              Alert.alert('Error', 'An unexpected error occurred');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };
  
  const submitSessionReview = async () => {
    if (!selectedSession) return;
    
    if (rating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }
    
    try {
      setIsSubmittingReview(true);
      
      const result = await submitReview(
        selectedSession.id,
        user.uid,
        selectedSession.tutorId,
        rating,
        reviewComment
      );
      
      if (result.success) {
        Alert.alert('Success', 'Your review has been submitted');
        setIsReviewModalVisible(false);
        fetchSessions();
      } else {
        Alert.alert('Error', result.error || 'Failed to submit review');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsSubmittingReview(false);
    }
  };
  
  const renderRatingStars = () => {
    return (
      <View style={styles.ratingContainer}>
        {[1, 2, 3, 4, 5].map(star => (
          <TouchableOpacity
            key={star}
            onPress={() => setRating(star)}
          >
            <MaterialIcons
              name={rating >= star ? 'star' : 'star-border'}
              size={32}
              color="#FFC107"
              style={styles.starIcon}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };
  
  const renderStatusChip = (status) => {
    let color, icon, label;
    
    switch (status) {
      case 'confirmed':
        color = '#4CAF50';
        icon = 'check-circle';
        label = 'Confirmed';
        break;
      case 'pending':
        color = '#FF9800';
        icon = 'pending';
        label = 'Pending';
        break;
      case 'cancelled':
        color = '#F44336';
        icon = 'cancel';
        label = 'Cancelled';
        break;
      default:
        color = '#9E9E9E';
        icon = 'help';
        label = 'Unknown';
    }
    
    return (
      <Chip 
        icon={() => <MaterialIcons name={icon} size={16} color={color} />}
        style={[styles.statusChip, { borderColor: color }]}
        textStyle={{ color }}
        mode="outlined"
      >
        {label}
      </Chip>
    );
  };
  
  const renderSessionItem = ({ item }) => {
    const sessionDate = new Date(item.date);
    const formattedDate = sessionDate.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

    const getStatusInfo = (status) => {
      switch (status) {
        case 'confirmed':
          return {
            color: '#9C27B0',
            bgColor: '#9C27B015',
            icon: 'event-available',
            text: 'Confirmed'
          };
        case 'completed':
          return {
            color: '#4CAF50',
            bgColor: '#4CAF5015',
            icon: 'check-circle',
            text: 'Completed'
          };
        case 'pending':
          return {
            color: '#FF9800',
            bgColor: '#FF980015',
            icon: 'schedule',
            text: 'Pending'
          };
        case 'cancelled':
          return {
            color: '#F44336',
            bgColor: '#F4433615',
            icon: 'cancel',
            text: 'Cancelled'
          };
        case 'rescheduled':
          return {
            color: '#2196F3',
            bgColor: '#2196F315',
            icon: 'update',
            text: 'Rescheduled'
          };
        default:
          return {
            color: '#9E9E9E',
            bgColor: '#9E9E9E15',
            icon: 'help',
            text: status
          };
      }
    };

    const statusInfo = getStatusInfo(item.status);

    return (
      <Card key={item.id} style={styles.sessionCard} mode="elevated">
        <Card.Content>
          <View style={styles.cardHeader}>
            <View>
              <Title style={styles.subject}>{item.subject}</Title>
              <Paragraph style={styles.dateText}>
                {formattedDate} • {item.startTime} - {item.endTime}
              </Paragraph>
            </View>
            {renderStatusChip(item.status)}
          </View>
          
          <View style={styles.tutorInfoContainer}>
            <MaterialIcons name="person" size={20} color="#9C27B0" />
            <Text style={styles.tutorText}>
              {item.tutorName}
            </Text>
          </View>
          
          <View style={styles.priceContainer}>
            <MaterialIcons name="attach-money" size={20} color="#9C27B0" />
            <Text style={styles.priceText}>
              ${item.hourlyRate}/hr
            </Text>
          </View>
          
          <View style={styles.actionsContainer}>
            {item.status === 'confirmed' && (
              <Button 
                mode="contained"
                buttonColor="#9C27B0"
                icon="chat"
                style={styles.actionButton}
                onPress={() => navigation.navigate('MessagesTab', {
                  screen: 'ChatDetails',
                  params: { recipientId: item.tutorId, recipientName: item.tutorName }
                })}
              >
                Contact Tutor
              </Button>
            )}
            
            {item.status === 'confirmed' && (
              <Button 
                mode="outlined"
                style={styles.detailsButton}
                textColor="#9C27B0"
                onPress={() => navigation.navigate('TutorsTab', {
                  screen: 'TutorDetail',
                  params: { tutorId: item.tutorId }
                })}
              >
                View Tutor
              </Button>
            )}
            
            {item.status === 'upcoming' && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#F4433620' }]}
                onPress={() => handleCancelSession(item)}
              >
                <Text style={[styles.actionButtonText, { color: '#F44336' }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            )}
            
            {item.status === 'rescheduled' && (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#9C27B020' }]}
                  onPress={() => handleAcceptReschedule(item)}
                >
                  <Text style={[styles.actionButtonText, { color: '#9C27B0' }]}>
                    Accept
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#F4433620' }]}
                  onPress={() => handleDeclineReschedule(item)}
                >
                  <Text style={[styles.actionButtonText, { color: '#F44336' }]}>
                    Decline
                  </Text>
                </TouchableOpacity>
              </>
            )}
            
            {item.status === 'past' && item.status !== 'cancelled' && !item.reviewSubmitted && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#9C27B020' }]}
                onPress={() => handleLeaveReview(item)}
              >
                <Text style={[styles.actionButtonText, { color: '#9C27B0' }]}>
                  Leave Review
                </Text>
              </TouchableOpacity>
            )}
            
            {item.status === 'past' && item.status === 'completed' && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#4CAF5020' }]}
                onPress={() => handleCompleteSession(item)}
              >
                <Text style={[styles.actionButtonText, { color: '#4CAF50' }]}>
                  Complete
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Card.Content>
      </Card>
    );
  };
  
  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      {filter === 'upcoming' ? (
        <>
          <MaterialIcons name="event-busy" size={64} color="#9E9E9E" style={styles.emptyIcon} />
          <Text style={styles.emptyText}>No upcoming sessions</Text>
          <Text style={styles.emptySubText}>
            Book a session with a tutor to get started with your learning journey
          </Text>
          <TouchableOpacity
            style={styles.findTutorButton}
            onPress={() => navigation.navigate('FindTutor')}
          >
            <Text style={styles.findTutorButtonText}>Find a Tutor</Text>
          </TouchableOpacity>
        </>
      ) : filter === 'past' ? (
        <>
          <MaterialIcons name="history" size={64} color="#9E9E9E" style={styles.emptyIcon} />
          <Text style={styles.emptyText}>No past sessions</Text>
          <Text style={styles.emptySubText}>
            Your completed sessions will appear here
          </Text>
        </>
      ) : (
        <>
          <MaterialIcons name="cancel" size={64} color="#9E9E9E" style={styles.emptyIcon} />
          <Text style={styles.emptyText}>No cancelled sessions</Text>
          <Text style={styles.emptySubText}>
            Sessions you cancel will appear here
          </Text>
        </>
      )}
    </View>
  );
  
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
              <Text style={styles.headerTitle}>My Sessions</Text>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </View>
      
      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          <Chip
            selected={filter === 'upcoming'}
            onPress={() => handleTabChange('upcoming')}
            style={styles.filterChip}
            selectedColor="#9C27B0"
          >
            Upcoming
          </Chip>
          <Chip
            selected={filter === 'past'}
            onPress={() => handleTabChange('past')}
            style={styles.filterChip}
            selectedColor="#9C27B0"
          >
            Past
          </Chip>
          <Chip
            selected={filter === 'all'}
            onPress={() => handleTabChange('all')}
            style={styles.filterChip}
            selectedColor="#9C27B0"
          >
            All Sessions
          </Chip>
        </ScrollView>
      </View>
      
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#9C27B0" />
            <Text style={styles.loadingText}>Loading your sessions...</Text>
          </View>
        ) : filteredSessions.length > 0 ? (
          filteredSessions.map(renderSessionItem)
        ) : (
          renderEmptyList()
        )}
      </ScrollView>
      
      {/* Review Modal */}
      <Modal
        visible={isReviewModalVisible}
        transparent={true}
        animationType="slide"
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalOverlay}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Rate Your Experience</Text>
              
              {renderRatingStars()}
              
              <View style={styles.reviewInputContainer}>
                <Text style={styles.reviewInputLabel}>Comments (optional)</Text>
                <TextInput
                  style={styles.reviewInput}
                  placeholder="Share your experience with this tutor..."
                  value={reviewComment}
                  onChangeText={setReviewComment}
                  multiline
                  maxLength={500}
                  blurOnSubmit={true}
                  returnKeyType="done"
                />
              </View>
              
              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={styles.modalCancelButton}
                  onPress={() => setIsReviewModalVisible(false)}
                  disabled={isSubmittingReview}
                >
                  <Text style={styles.modalCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.modalSubmitButton}
                  onPress={submitSessionReview}
                  disabled={isSubmittingReview || rating === 0}
                >
                  {isSubmittingReview ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.modalSubmitButtonText}>Submit</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>
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
    padding: 16,
    paddingBottom: 32,
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
  filterContainer: {
    paddingVertical: 8,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  filterScrollContent: {
    paddingHorizontal: 16,
  },
  filterChip: {
    marginRight: 8,
    marginVertical: 4,
  },
  sessionCard: {
    marginBottom: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  subject: {
    fontSize: 18,
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    color: '#4B5563',
  },
  statusChip: {
    height: 32,
  },
  tutorInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  tutorText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  priceText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  actionButton: {
    marginLeft: 12,
    borderRadius: 8,
  },
  detailsButton: {
    marginLeft: 12,
    borderRadius: 8,
    borderColor: '#9C27B0',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    minHeight: 300,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#4B5563',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    minHeight: 300,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyText: {
    marginTop: 16,
    marginBottom: 24,
    fontSize: 16,
    color: '#4B5563',
    textAlign: 'center',
  },
  emptySubText: {
    marginBottom: 24,
    color: '#6B7280',
    textAlign: 'center',
  },
  findTutorButton: {
    borderRadius: 8,
  },
  findTutorButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  starIcon: {
    marginHorizontal: 4,
  },
  reviewInputContainer: {
    marginBottom: 24,
  },
  reviewInputLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    height: 100,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalCancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
    marginRight: 8,
  },
  modalCancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
  modalSubmitButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#2196F3',
    alignItems: 'center',
    marginLeft: 8,
  },
  modalSubmitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default MySessionsScreen; 