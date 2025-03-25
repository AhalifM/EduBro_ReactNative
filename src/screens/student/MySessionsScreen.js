import React, { useState, useEffect, useCallback } from 'react';
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
  Keyboard
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { getUserSessions, cancelSession, submitReview, updateSessionStatus } from '../../utils/tutorUtils';
import { completeSessionAndReleasePayment, processRefund } from '../../utils/paymentUtils';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

const MySessionsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [rating, setRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  
  // Use useFocusEffect to fetch sessions when the screen is focused
  useFocusEffect(
    useCallback(() => {
      if (user?.uid) {
        console.log('Fetching sessions on focus with active tab:', activeTab);
        fetchSessions();
      }
      
      return () => {
        // Clean up function if needed
      };
    }, [user, activeTab])
  );
  
  const fetchSessions = async () => {
    try {
      setIsLoading(true);
      
      // Get all sessions for the user as student
      const result = await getUserSessions(user.uid, 'student');
      
      if (result.success) {
        console.log('Fetched sessions:', result.sessions.length);
        
        // Sort by date and time
        const sortedSessions = result.sessions.sort((a, b) => {
          const dateA = new Date(`${a.date}T${a.startTime}`);
          const dateB = new Date(`${b.date}T${b.startTime}`);
          return dateA - dateB;
        });
        
        const now = new Date();
        console.log('Current time:', now.toISOString());
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        console.log('Today (start of day):', today.toISOString());
        
        let filteredSessions;
        
        if (activeTab === 'upcoming') {
          // Filter future sessions that are confirmed, rescheduled OR pending
          // Also check if the session time has already passed today
          filteredSessions = sortedSessions.filter(session => {
            const sessionDate = new Date(session.date);
            
            // Create a proper date-time object by combining date and time
            const [hours, minutes] = session.startTime.split(':').map(Number);
            const sessionDateTime = new Date(session.date);
            sessionDateTime.setHours(hours, minutes, 0, 0);
            
            console.log(`Session ${session.id} DateTime:`, sessionDateTime.toISOString(), 'Now:', now.toISOString(), 'IsInFuture:', sessionDateTime > now);
            
            // Session is in the future and has the correct status
            const isInFuture = sessionDateTime > now;
            const hasCorrectStatus = (session.status === 'confirmed' || 
                             session.status === 'rescheduled' || 
                             session.status === 'pending');
                             
            return isInFuture && hasCorrectStatus;
          });
          console.log('Upcoming filtered sessions:', filteredSessions.length);
        } else if (activeTab === 'cancelled') {
          // Filter cancelled sessions
          filteredSessions = sortedSessions.filter(session => {
            return session.status === 'cancelled';
          });
          console.log('Cancelled filtered sessions:', filteredSessions.length);
        } else {
          // Past or completed sessions
          // Include sessions that were today but time has passed
          filteredSessions = sortedSessions.filter(session => {
            // Create a proper date-time object by combining date and time
            const [hours, minutes] = session.startTime.split(':').map(Number);
            const sessionDateTime = new Date(session.date);
            sessionDateTime.setHours(hours, minutes, 0, 0);
            
            console.log(`Past session ${session.id} DateTime:`, sessionDateTime.toISOString(), 'Now:', now.toISOString(), 'IsInPast:', sessionDateTime <= now);
            
            // Either the session is in the past or it's completed
            const isInPast = sessionDateTime <= now;
            const isNotCancelled = session.status !== 'cancelled';
            const isCompleted = session.status === 'completed';
            
            return (isInPast && isNotCancelled) || isCompleted;
          });
          console.log('Past filtered sessions:', filteredSessions.length);
        }
        
        setSessions(filteredSessions);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
      Alert.alert('Error', 'Failed to load sessions');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleTabChange = (tabName) => {
    console.log('Changing tab to:', tabName);
    setActiveTab(tabName);
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
  
  const renderSessionItem = ({ item }) => {
    const sessionDate = new Date(item.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Create a date-time object for time comparison
    const [hours, minutes] = item.startTime.split(':').map(Number);
    const sessionDateTime = new Date(item.date);
    sessionDateTime.setHours(hours, minutes, 0, 0);
    const now = new Date();
    
    // Check if this session has passed but not marked as completed
    const hasPassed = sessionDateTime < now;
    
    const isUpcoming = sessionDateTime > now;
    const isPast = hasPassed;
    const isCompleted = item.status === 'completed';
    const isCancelled = item.status === 'cancelled';
    const isRescheduled = item.status === 'rescheduled';
    const isPending = item.status === 'pending';
    
    const formattedDate = sessionDate.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    
    return (
      <View 
        style={[
          styles.sessionCard,
          isCancelled && styles.cancelledCard,
          isRescheduled && styles.rescheduledCard
        ]}
      >
        <View style={styles.sessionHeader}>
          <Text style={styles.sessionSubject}>{item.subject}</Text>
          {isCancelled && (
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>Cancelled</Text>
            </View>
          )}
          {isCompleted && (
            <View style={[styles.statusBadge, styles.completedBadge]}>
              <Text style={styles.statusText}>Completed</Text>
            </View>
          )}
          {isPending && !hasPassed && (
            <View style={[styles.statusBadge, styles.pendingBadge]}>
              <Text style={styles.statusText}>Pending</Text>
            </View>
          )}
          {isRescheduled && (
            <View style={[styles.statusBadge, styles.rescheduledBadge]}>
              <Text style={styles.statusText}>Rescheduled</Text>
            </View>
          )}
          {isPending && hasPassed && (
            <View style={[styles.statusBadge, styles.pastPendingBadge]}>
              <Text style={styles.statusText}>Needs Completion</Text>
            </View>
          )}
        </View>
        
        <View style={styles.sessionDetails}>
          <View style={styles.detailRow}>
            <MaterialIcons name="person" size={20} color="#666" />
            <Text style={styles.detailText}>Tutor: {item.tutorName}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <MaterialIcons name="event" size={20} color="#666" />
            <Text style={styles.detailText}>Date: {formattedDate}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <MaterialIcons name="access-time" size={20} color="#666" />
            <Text style={styles.detailText}>
              Time: {item.startTime} - {item.endTime}
            </Text>
          </View>
          
          {item.tutorPhoneNumber && (
            <View style={styles.detailRow}>
              <MaterialIcons name="phone" size={20} color="#666" />
              <Text style={styles.detailText}>
                Contact: {item.tutorPhoneNumber}
              </Text>
            </View>
          )}
          
          <View style={styles.detailRow}>
            <MaterialIcons name="attach-money" size={20} color="#666" />
            <Text style={styles.detailText}>
              Price: ${item.hourlyRate}/hr
            </Text>
          </View>
        </View>
        
        {isUpcoming && !isCancelled && !isRescheduled && !isPending && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => handleCancelSession(item)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {isPending && !hasPassed && (
          <View style={styles.statusMessage}>
            <Text style={styles.pendingText}>
              Waiting for tutor to approve this session
            </Text>
          </View>
        )}
        
        {isPending && hasPassed && (
          <View style={styles.statusMessage}>
            <Text style={styles.pendingText}>
              This session has passed but hasn't been marked as completed. 
              You can complete it using the button below.
            </Text>
          </View>
        )}
        
        {isRescheduled && (
          <View style={styles.rescheduledContainer}>
            <Text style={styles.rescheduledText}>
              Your tutor has rescheduled this session. Please review the new time.
            </Text>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={() => handleAcceptReschedule(item)}
              >
                <Text style={styles.acceptButtonText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.declineButton}
                onPress={() => handleDeclineReschedule(item)}
              >
                <Text style={styles.declineButtonText}>Decline</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        {isPast && isCompleted && !item.hasReview && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.reviewButton}
              onPress={() => handleLeaveReview(item)}
            >
              <Text style={styles.reviewButtonText}>Leave Review</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {isPast && !isCompleted && !isCancelled && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.completeButton}
              onPress={() => handleCompleteSession(item)}
            >
              <Text style={styles.completeButtonText}>Complete Session</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };
  
  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="event-busy" size={60} color="#ccc" />
      <Text style={styles.emptyText}>
        {activeTab === 'upcoming' 
          ? "You don't have any upcoming sessions" 
          : activeTab === 'cancelled'
          ? "You don't have any cancelled sessions"
          : "You don't have any past sessions"}
      </Text>
      
      {activeTab === 'upcoming' && (
        <TouchableOpacity
          style={styles.findTutorButton}
          onPress={() => navigation.navigate('TutorsTab')}
        >
          <Text style={styles.findTutorButtonText}>Find a Tutor</Text>
        </TouchableOpacity>
      )}
    </View>
  );
  
  if (isLoading && sessions.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Loading sessions...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'upcoming' && styles.activeTab
            ]}
            onPress={() => handleTabChange('upcoming')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'upcoming' && styles.activeTabText
              ]}
            >
              Upcoming
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'past' && styles.activeTab
            ]}
            onPress={() => handleTabChange('past')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'past' && styles.activeTabText
              ]}
            >
              Past
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'cancelled' && styles.activeTab
            ]}
            onPress={() => handleTabChange('cancelled')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'cancelled' && styles.activeTabText
              ]}
            >
              Cancelled
            </Text>
          </TouchableOpacity>
        </View>
        
        <FlatList
          data={sessions}
          renderItem={renderSessionItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyList}
          refreshing={isLoading}
          onRefresh={fetchSessions}
        />
        
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
      </View>
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
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#2196F3',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  activeTabText: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
    flexGrow: 1,
  },
  sessionCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cancelledCard: {
    opacity: 0.7,
  },
  rescheduledCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sessionSubject: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    backgroundColor: '#F44336',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  completedBadge: {
    backgroundColor: '#4CAF50',
  },
  pendingBadge: {
    backgroundColor: '#FFC107',
  },
  pastPendingBadge: {
    backgroundColor: '#FF9800',
  },
  rescheduledBadge: {
    backgroundColor: '#FF9800',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  sessionDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  cancelButton: {
    backgroundColor: '#F44336',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  reviewButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  reviewButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  completeButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  completeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    flex: 1,
    minHeight: 300,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  findTutorButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  findTutorButtonText: {
    color: '#fff',
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
  rescheduledContainer: {
    marginBottom: 16,
  },
  rescheduledText: {
    color: '#333',
    fontSize: 16,
    marginBottom: 8,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginRight: 8,
  },
  acceptButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  declineButton: {
    backgroundColor: '#F44336',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  declineButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  statusMessage: {
    marginBottom: 16,
  },
  pendingText: {
    color: '#333',
    fontSize: 16,
  },
});

export default MySessionsScreen; 