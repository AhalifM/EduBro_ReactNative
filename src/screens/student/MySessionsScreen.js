import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { getUserSessions, cancelSession } from '../../utils/tutorUtils';
import { completeSessionAndReleasePayment } from '../../utils/paymentUtils';
import { submitReview } from '../../utils/tutorUtils';

const MySessionsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [rating, setRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  
  useEffect(() => {
    if (user?.uid) {
      fetchSessions();
    }
    
    // Refresh sessions when screen is focused
    const unsubscribe = navigation.addListener('focus', () => {
      if (user?.uid) {
        fetchSessions();
      }
    });
    
    return unsubscribe;
  }, [navigation, user]);
  
  const fetchSessions = async () => {
    try {
      setIsLoading(true);
      
      // Filter sessions based on active tab
      const statusFilter = activeTab === 'upcoming' ? 'confirmed' : null;
      
      const result = await getUserSessions(user.uid, 'student', statusFilter);
      
      if (result.success) {
        // Sort by date and time
        const sortedSessions = result.sessions.sort((a, b) => {
          const dateA = new Date(`${a.date}T${a.startTime}`);
          const dateB = new Date(`${b.date}T${b.startTime}`);
          return dateA - dateB;
        });
        
        if (activeTab === 'upcoming') {
          // Filter future sessions
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const futureSessions = sortedSessions.filter(session => {
            const sessionDate = new Date(session.date);
            return sessionDate >= today && session.status === 'confirmed';
          });
          
          setSessions(futureSessions);
        } else {
          // Past, completed, or canceled sessions
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const pastSessions = sortedSessions.filter(session => {
            const sessionDate = new Date(session.date);
            return sessionDate < today || 
                  session.status === 'completed' || 
                  session.status === 'cancelled';
          });
          
          setSessions(pastSessions);
        }
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
      Alert.alert('Error', 'Failed to load sessions');
    } finally {
      setIsLoading(false);
    }
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
    // Check if session date has passed
    const sessionDate = new Date(session.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (sessionDate > today) {
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
    setRating(0);
    setReviewComment('');
    setIsReviewModalVisible(true);
  };
  
  const submitSessionReview = async () => {
    if (!selectedSession) return;
    
    if (rating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }
    
    try {
      setIsSubmittingReview(true);
      
      const result = await submitReview({
        sessionId: selectedSession.id,
        tutorId: selectedSession.tutorId,
        studentId: user.uid,
        rating,
        comment: reviewComment,
      });
      
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
    const isUpcoming = activeTab === 'upcoming';
    const isPast = !isUpcoming;
    const isCompleted = item.status === 'completed';
    const isCancelled = item.status === 'cancelled';
    
    // Calculate if session is today
    const sessionDate = new Date(item.date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const isToday = sessionDate.toDateString() === today.toDateString();
    const isTomorrow = sessionDate.toDateString() === tomorrow.toDateString();
    
    // Format date display
    let formattedDate;
    if (isToday) {
      formattedDate = 'Today';
    } else if (isTomorrow) {
      formattedDate = 'Tomorrow';
    } else {
      formattedDate = item.date;
    }
    
    return (
      <View 
        style={[
          styles.sessionCard,
          isCancelled && styles.cancelledCard
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
              Price: ${item.hourlyRate}
            </Text>
          </View>
        </View>
        
        {isUpcoming && !isCancelled && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => handleCancelSession(item)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
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
          : "You don't have any past sessions"}
      </Text>
      
      {activeTab === 'upcoming' && (
        <TouchableOpacity
          style={styles.findTutorButton}
          onPress={() => navigation.navigate('FindTutor')}
        >
          <Text style={styles.findTutorButtonText}>Find a Tutor</Text>
        </TouchableOpacity>
      )}
    </View>
  );
  
  if (isLoading && sessions.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading sessions...</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'upcoming' && styles.activeTab
          ]}
          onPress={() => {
            setActiveTab('upcoming');
            fetchSessions();
          }}
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
          onPress={() => {
            setActiveTab('past');
            fetchSessions();
          }}
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
        <View style={styles.modalOverlay}>
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
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
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
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
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
    height: 120,
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