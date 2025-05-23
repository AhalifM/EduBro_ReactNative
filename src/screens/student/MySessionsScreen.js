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
  const [filter, setFilter] = useState('upcoming'); // upcoming, past, cancelled, rescheduled, pending, all
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
        console.log(`Fetched ${result.sessions?.length || 0} sessions`);
        
        // Ensure sessions is an array
        if (!Array.isArray(result.sessions)) {
          console.error('Sessions is not an array:', result.sessions);
          setSessions([]);
          return;
        }
        
        // Remove any null/undefined sessions
        const validSessions = result.sessions.filter(session => 
          session !== undefined && 
          session !== null && 
          typeof session === 'object'
        );
        
        if (validSessions.length !== result.sessions.length) {
          console.warn(`Filtered out ${result.sessions.length - validSessions.length} null/undefined sessions`);
        }
        
        // Validate each session has required fields
        const requiredFields = ['id', 'date', 'status'];
        const fullySanitizedSessions = validSessions.map((session, index) => {
          // Deep clone to avoid any reference issues
          const sanitizedSession = {...session};
          
          // Check for required fields
          for (const field of requiredFields) {
            if (!sanitizedSession[field]) {
              console.warn(`Session at index ${index} missing ${field}:`, sanitizedSession);
              return null; // Filter out this session
            }
          }
          
          // Ensure date is valid
          try {
            new Date(sanitizedSession.date);
          } catch (error) {
            console.warn(`Session at index ${index} has invalid date:`, sanitizedSession);
            return null;
          }
          
          return sanitizedSession;
        }).filter(session => session !== null);
        
        if (fullySanitizedSessions.length !== validSessions.length) {
          console.warn(`Filtered out ${validSessions.length - fullySanitizedSessions.length} sessions with invalid data`);
        }
        
        console.log(`Setting ${fullySanitizedSessions.length} fully sanitized sessions`);
        setSessions(fullySanitizedSessions);
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
    if (!sessions || !Array.isArray(sessions) || sessions.length === 0) {
      return [];
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Since we've already sanitized the sessions data in fetchSessions,
    // we can be more confident that all items have valid properties
    return sessions.filter(session => {
      try {
        const sessionDate = new Date(session.date);
        
        if (filter === 'upcoming') {
          // Include sessions with dates in the future or today with a confirmed status only
          return (sessionDate >= today && 
                 session.status === 'confirmed' && 
                 session.status !== 'rescheduled');
        } else if (filter === 'past') {
          // Include sessions with dates in the past OR those that are completed regardless of date
          return (sessionDate < today && session.status !== 'cancelled') || 
                 session.status === 'completed';
        } else if (filter === 'cancelled') {
          // Only show cancelled sessions
          return session.status === 'cancelled';
        } else if (filter === 'rescheduled') {
          // Only show rescheduled sessions
          return session.status === 'rescheduled';
        } else if (filter === 'pending') {
          // Only show pending sessions
          return session.status === 'pending';
        } else {
          return true; // all
        }
      } catch (error) {
        console.error("Error in filteredSessions:", error, session);
        return false;
      }
    }).sort((a, b) => {
      try {
        // Sort by date
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        
        if (dateA > dateB) return filter === 'past' ? -1 : 1;
        if (dateA < dateB) return filter === 'past' ? 1 : -1;
        
        // If same date, sort by time
        const timeA = a.startTime?.replace(':', '') || '0000';
        const timeB = b.startTime?.replace(':', '') || '0000';
        return filter === 'past' ? Number(timeB) - Number(timeA) : Number(timeA) - Number(timeB);
      } catch (error) {
        console.error("Error sorting sessions:", error, { a, b });
        return 0;
      }
    });
  }, [sessions, filter]);
  
  const handleTabChange = (tabName) => {
    console.log('Changing tab to:', tabName);
    setFilter(tabName);
  };
  
  const handleCancelSession = async (session) => {
    if (!session || !session.date || !session.startTime) {
      console.error("Invalid session object:", session);
      Alert.alert("Error", "Invalid session information. Please try again later.");
      return;
    }

    try {
      // Parse session date and time properly
      const sessionDate = new Date(session.date);
      const [hours, minutes] = session.startTime.split(':').map(Number);
      
      // Create a proper date-time object for the session start
      const sessionDateTime = new Date(sessionDate);
      sessionDateTime.setHours(hours, minutes, 0, 0);
      
      // Get current time
      const now = new Date();
      
      // Calculate time difference in milliseconds
      const timeDiffMs = sessionDateTime.getTime() - now.getTime();
      
      // Convert to hours (with decimal precision)
      const hoursUntilSession = timeDiffMs / (1000 * 60 * 60);
      
      console.log(`Session time: ${sessionDateTime.toLocaleString()}`);
      console.log(`Current time: ${now.toLocaleString()}`);
      console.log(`Hours until session: ${hoursUntilSession.toFixed(2)}`);
      
      if (hoursUntilSession < 5) {
        // Format the minimum cancel time to show the user
        const minCancelTime = new Date(sessionDateTime.getTime() - (5 * 60 * 60 * 1000));
        const formattedMinTime = minCancelTime.toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric'
        });
        
        Alert.alert(
          'Cannot Cancel Session',
          `Sessions must be cancelled at least 5 hours before the start time.\n\nThis session starts at ${sessionDateTime.toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric'
          })}.\n\nThe cancellation deadline was ${formattedMinTime}.`
        );
        return;
      }
      
      // If we get here, cancellation is allowed
      Alert.alert(
        'Cancel Session',
        `Are you sure you want to cancel this session?\n\nSession: ${session.subject}\nDate: ${sessionDateTime.toLocaleDateString()}\nTime: ${session.startTime} - ${session.endTime}`,
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
    } catch (error) {
      console.error("Error processing cancellation request:", error);
      Alert.alert("Error", "There was a problem processing your cancellation request. Please try again later.");
    }
  };
  
  const handleCompleteSession = async (session) => {
    if (!session || !session.date || !session.startTime) {
      console.error("Invalid session object:", session);
      Alert.alert("Error", "Invalid session information. Please try again later.");
      return;
    }

    // Time check removed to allow completion at any time
    
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
                    }
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
      case 'completed':
        color = '#4CAF50';
        icon = 'check-circle';
        label = 'Completed';
        break;
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
      case 'rescheduled':
        color = '#2196F3';
        icon = 'update';
        label = 'Rescheduled';
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
  
  const renderSessionItem = ({ item, index }) => {
    // Early return if item is undefined/null
    if (!item) {
      console.error(`Session at index ${index} is null or undefined`);
      return null;
    }
    
    // Validate all required fields
    const requiredFields = ['id', 'date', 'status', 'subject', 'startTime', 'endTime'];
    const missingFields = requiredFields.filter(field => !item[field]);
    
    if (missingFields.length > 0) {
      console.error(`Session is missing required fields: ${missingFields.join(', ')}`, JSON.stringify(item, null, 2));
      return null;
    }

    let formattedDate;
    try {
      const sessionDate = new Date(item.date);
      formattedDate = sessionDate.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    } catch (error) {
      console.error("Error formatting session date:", error, item);
      formattedDate = "Invalid date";
    }

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
    const isSessionCancelled = item.status === 'cancelled';
    const isSessionRescheduled = item.status === 'rescheduled';
    const isSessionPending = item.status === 'pending';

    return (
      <Card 
        key={item.id} 
        style={[
          styles.sessionCard, 
          isSessionCancelled && styles.cancelledSessionCard,
          isSessionRescheduled && styles.rescheduledSessionCard,
          isSessionPending && styles.pendingSessionCard
        ]} 
        mode="elevated"
      >
        <Card.Content>
          <View style={styles.cardHeader}>
            <View>
              <Title style={styles.subject}>{item.subject}</Title>
              <Paragraph style={styles.dateText}>
                {formattedDate} • {item.startTime} - {item.endTime}
              </Paragraph>
              {isSessionRescheduled && item.originalTime && (
                <Paragraph style={styles.rescheduledText}>
                  <MaterialIcons name="refresh" size={14} color="#2196F3" />
                  <Text> Rescheduled: {item.originalTime} → {item.startTime}</Text>
                </Paragraph>
              )}
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
          
          {!isSessionCancelled && (
            <>
              <View style={styles.divider} />
              
              <View style={styles.actionsContainer}>
                {item.status === 'confirmed' && filter === 'upcoming' && (
                  <View style={styles.buttonRow}>
                    <TouchableOpacity 
                      style={styles.cancelButtonContainer}
                      onPress={() => handleCancelSession(item)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.buttonContent}>
                        <MaterialIcons name="close" size={18} color="#F44336" />
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </View>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.completeButtonContainer}
                      onPress={() => handleCompleteSession(item)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.buttonContent}>
                        <MaterialIcons name="check-circle" size={18} color="#FFFFFF" />
                        <Text style={styles.completeButtonText}>Complete</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                )}
                
                {item.status === 'confirmed' && filter === 'past' && (
                  <View style={styles.buttonRow}>
                    {!item.reviewSubmitted && (
                      <TouchableOpacity 
                        style={styles.reviewButtonContainer}
                        onPress={() => handleLeaveReview(item)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.buttonContent}>
                          <MaterialIcons name="star" size={18} color="#FFFFFF" />
                          <Text style={styles.completeButtonText}>Rate Tutor</Text>
                        </View>
                      </TouchableOpacity>
                    )}
                    
                    <TouchableOpacity 
                      style={styles.completeButtonContainer}
                      onPress={() => handleCompleteSession(item)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.buttonContent}>
                        <MaterialIcons name="check-circle" size={18} color="#FFFFFF" />
                        <Text style={styles.completeButtonText}>Complete</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                )}
                
                {item.status === 'completed' && !item.reviewSubmitted && (
                  <TouchableOpacity 
                    style={styles.reviewButtonContainer}
                    activeOpacity={1}
                  >
                    <View style={styles.buttonContent}>
                      <MaterialIcons name="star" size={18} color="#FFFFFF" />
                      <Text style={styles.completeButtonText}>Rate Tutor</Text>
                    </View>
                  </TouchableOpacity>
                )}
                
                {item.status !== 'confirmed' && item.status !== 'cancelled' && item.status !== 'completed' && !item.reviewSubmitted && filter === 'past' && (
                  <TouchableOpacity 
                    style={styles.reviewButtonContainer}
                    activeOpacity={0.7}
                  >
                    <View style={styles.buttonContent}>
                      <MaterialIcons name="star" size={18} color="#FFFFFF" />
                      <Text style={styles.completeButtonText}>Tutor Rated</Text>
                    </View>
                  </TouchableOpacity>
                )}
                
                {item.status === 'rescheduled' && (
                  <View style={styles.buttonRow}>
                    <TouchableOpacity 
                      style={styles.acceptButtonContainer}
                      onPress={() => handleAcceptReschedule(item)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.buttonContent}>
                        <MaterialIcons name="check" size={18} color="#FFFFFF" />
                        <Text style={styles.completeButtonText}>Accept</Text>
                      </View>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.declineButtonContainer}
                      onPress={() => handleDeclineReschedule(item)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.buttonContent}>
                        <MaterialIcons name="close" size={18} color="#FFFFFF" />
                        <Text style={styles.completeButtonText}>Decline</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                )}
                
                {item.status === 'pending' && (
                  <View style={styles.pendingInfoContainer}>
                    <View style={styles.pendingStatusRow}>
                      <MaterialIcons name="hourglass-empty" size={20} color="#FF9800" />
                      <Text style={styles.pendingText}>
                        Waiting for tutor approval
                      </Text>
                    </View>
                    
                    <TouchableOpacity 
                      style={[styles.cancelButtonContainer, { width: '100%', marginTop: 8 }]}
                      onPress={() => handleCancelSession(item)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.buttonContent}>
                        <MaterialIcons name="close" size={18} color="#F44336" />
                        <Text style={styles.cancelButtonText}>Cancel Request</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </>
          )}
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
            onPress={() => navigation.navigate('TutorsTab')}
          >
            <Text style={styles.findTutorButtonText}>Find a Tutor</Text>
          </TouchableOpacity>
        </>
      ) : filter === 'past' ? (
        <>
          <MaterialIcons name="history" size={64} color="#9E9E9E" style={styles.emptyIcon} />
          <Text style={styles.emptyText}>No completed sessions</Text>
          <Text style={styles.emptySubText}>
            Sessions you complete or those that have passed will appear here
          </Text>
        </>
      ) : filter === 'cancelled' ? (
        <>
          <MaterialIcons name="cancel" size={64} color="#9E9E9E" style={styles.emptyIcon} />
          <Text style={styles.emptyText}>No cancelled sessions</Text>
          <Text style={styles.emptySubText}>
            Sessions you cancel will appear here
          </Text>
        </>
      ) : filter === 'rescheduled' ? (
        <>
          <MaterialIcons name="update" size={64} color="#9E9E9E" style={styles.emptyIcon} />
          <Text style={styles.emptyText}>No rescheduled sessions</Text>
          <Text style={styles.emptySubText}>
            When a tutor reschedules a session, it will appear here for your approval
          </Text>
        </>
      ) : filter === 'pending' ? (
        <>
          <MaterialIcons name="hourglass-empty" size={64} color="#9E9E9E" style={styles.emptyIcon} />
          <Text style={styles.emptyText}>No pending sessions</Text>
          <Text style={styles.emptySubText}>
            Sessions waiting for approval will appear here
          </Text>
        </>
      ) : (
        <>
          <MaterialIcons name="school" size={64} color="#9E9E9E" style={styles.emptyIcon} />
          <Text style={styles.emptyText}>No sessions found</Text>
          <Text style={styles.emptySubText}>
            When you book sessions, they will appear here
          </Text>
        </>
      )}
    </View>
  );
  
  const hasRescheduledSessions = useMemo(() => {
    if (!sessions || !Array.isArray(sessions)) return false;
    return sessions.some(session => session.status === 'rescheduled');
  }, [sessions]);

  const hasPendingSessions = useMemo(() => {
    if (!sessions || !Array.isArray(sessions)) return false;
    return sessions.some(session => session.status === 'pending');
  }, [sessions]);
  
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
          contentContainerStyle={styles.filterTabsContainer}
          decelerationRate="fast"
          snapToAlignment="center"
        >
          <TouchableOpacity
            onPress={() => handleTabChange('all')}
            style={[
              styles.tabButton,
              filter === 'all' && styles.activeTabButton
            ]}
          >
            <View style={styles.tabContent}>
              <MaterialIcons 
                name="format-list-bulleted" 
                size={24} 
                color={filter === 'all' ? "#FFFFFF" : "#9C27B0"} 
              />
              <Text style={[
                styles.tabText,
                filter === 'all' && styles.activeTabText
              ]}>All</Text>
            </View>
            {filter === 'all' && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => handleTabChange('upcoming')}
            style={[
              styles.tabButton,
              filter === 'upcoming' && styles.activeTabButton
            ]}
          >
            <View style={styles.tabContent}>
              <MaterialIcons 
                name="event-available" 
                size={24} 
                color={filter === 'upcoming' ? "#FFFFFF" : "#9C27B0"} 
              />
              <Text style={[
                styles.tabText,
                filter === 'upcoming' && styles.activeTabText
              ]}>Upcoming</Text>
            </View>
            {filter === 'upcoming' && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => handleTabChange('pending')}
            style={[
              styles.tabButton,
              filter === 'pending' && styles.activeTabButton
            ]}
          >
            <View style={styles.tabContent}>
              <MaterialIcons 
                name="hourglass-top" 
                size={24} 
                color={filter === 'pending' ? "#FFFFFF" : "#9C27B0"} 
              />
              <Text style={[
                styles.tabText,
                filter === 'pending' && styles.activeTabText
              ]}>Pending</Text>
              {hasPendingSessions && filter !== 'pending' && <View style={styles.notificationDot} />}
            </View>
            {filter === 'pending' && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => handleTabChange('rescheduled')}
            style={[
              styles.tabButton,
              filter === 'rescheduled' && styles.activeTabButton
            ]}
          >
            <View style={styles.tabContent}>
              <MaterialIcons 
                name="update" 
                size={24} 
                color={filter === 'rescheduled' ? "#FFFFFF" : "#9C27B0"} 
              />
              <Text style={[
                styles.tabText,
                filter === 'rescheduled' && styles.activeTabText
              ]}>Rescheduled</Text>
              {hasRescheduledSessions && filter !== 'rescheduled' && <View style={styles.notificationDot} />}
            </View>
            {filter === 'rescheduled' && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => handleTabChange('past')}
            style={[
              styles.tabButton,
              filter === 'past' && styles.activeTabButton
            ]}
          >
            <View style={styles.tabContent}>
              <MaterialIcons 
                name="done-all" 
                size={24} 
                color={filter === 'past' ? "#FFFFFF" : "#9C27B0"} 
              />
              <Text style={[
                styles.tabText,
                filter === 'past' && styles.activeTabText
              ]}>Completed</Text>
            </View>
            {filter === 'past' && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => handleTabChange('cancelled')}
            style={[
              styles.tabButton,
              filter === 'cancelled' && styles.activeTabButton
            ]}
          >
            <View style={styles.tabContent}>
              <MaterialIcons 
                name="cancel" 
                size={24} 
                color={filter === 'cancelled' ? "#FFFFFF" : "#9C27B0"} 
              />
              <Text style={[
                styles.tabText,
                filter === 'cancelled' && styles.activeTabText
              ]}>Cancelled</Text>
            </View>
            {filter === 'cancelled' && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
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
          <FlatList
            data={filteredSessions.filter(session => session !== undefined)}
            renderItem={renderSessionItem}
            keyExtractor={item => item.id}
            contentContainerStyle={{ paddingBottom: 20 }}
            scrollEnabled={false}
            ListEmptyComponent={renderEmptyList}
          />
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
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  filterTabsContainer: {
    paddingHorizontal: 12,
  },
  tabButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginHorizontal: 6,
    position: 'relative',
    backgroundColor: '#ffffff',
    borderWidth: 0.25,
    borderColor: '#9C27B0',
    height: 48,
    marginVertical: 4,
    justifyContent: 'center',
    overflow: 'visible',
  },
  activeTabButton: {
    backgroundColor: '#9C27B0',
    elevation: 2,
    shadowColor: '#9C27B0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9C27B0',
    marginLeft: 8,
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -3,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  notificationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF5252',
    position: 'absolute',
    right: -5,
    top: -5,
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
  cancelledSessionCard: {
    backgroundColor: '#F4433615',
  },
  rescheduledSessionCard: {
    backgroundColor: '#2196F315',
  },
  pendingSessionCard: {
    backgroundColor: '#FF980015',
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
    marginBottom: 12,
  },
  priceText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  actionsContainer: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  actionButton: {
    flex: 1,
    borderRadius: 25,
    marginHorizontal: 4,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  completeButton: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  cancelButtonContainer: {
    flex: 1,
    height: 45,
    borderRadius: 25,
    borderColor: '#F44336',
    borderWidth: 1.5,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  completeButtonContainer: {
    flex: 1,
    height: 45,
    borderRadius: 25,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#F44336',
    fontWeight: '500',
  },
  completeButtonText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  reviewButton: {
    backgroundColor: '#FF9800',
    borderColor: '#FF9800',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginVertical: 8,
    gap: 8,
  },
  rescheduleButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginVertical: 4,
  },
  acceptButton: {
    flex: 1,
    marginRight: 8,
    borderRadius: 8,
  },
  rejectButton: {
    flex: 1,
    marginLeft: 8,
    borderRadius: 8,
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
    backgroundColor: '#9C27B0',
    paddingVertical: 12,
    paddingHorizontal: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
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
  rescheduledText: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  pendingInfoContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 8,
  },
  pendingStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  pendingText: {
    fontSize: 16,
    color: '#FF9800',
    marginLeft: 8,
    fontWeight: '500',
  },
  reviewButtonContainer: {
    flex: 1,
    height: 45,
    borderRadius: 25,
    backgroundColor: '#FF9800',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  acceptButtonContainer: {
    flex: 1,
    height: 45,
    borderRadius: 25,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  declineButtonContainer: {
    flex: 1,
    height: 45,
    borderRadius: 25,
    backgroundColor: '#F44336',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
});

export default MySessionsScreen; 