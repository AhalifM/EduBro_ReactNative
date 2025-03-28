import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList
} from 'react-native';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { getTutorAvailability, bookSession, getAllSubjects } from '../../utils/tutorUtils';
import { processPayment } from '../../utils/paymentUtils';
import { useAuth } from '../../contexts/AuthContext';

const TutorDetailScreen = ({ route, navigation }) => {
  const { tutor } = route.params;
  const { user } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [availabilityData, setAvailabilityData] = useState([]);
  const [markedDates, setMarkedDates] = useState({});
  const [selectedDate, setSelectedDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [isBookingModalVisible, setIsBookingModalVisible] = useState(false);
  const [isConfirmingBooking, setIsConfirmingBooking] = useState(false);
  const [subjectsList, setSubjectsList] = useState([]);
  
  useEffect(() => {
    if (tutor?.uid) {
      fetchAvailability();
      fetchSubjects();
    }
  }, [tutor]);
  
  useEffect(() => {
    // Set the first subject as selected by default
    if (tutor?.subjects?.length > 0 && !selectedSubject && subjectsList.length > 0) {
      const firstSubject = subjectsList.find(s => s.id === tutor.subjects[0]);
      if (firstSubject) {
        setSelectedSubject(firstSubject.id);
      }
    }
  }, [tutor, subjectsList]);
  
  const fetchAvailability = async () => {
    try {
      setIsLoading(true);
      
      // Get availability for the next 3 months
      const now = new Date();
      // Format the dates as strings directly to avoid the toISOString error
      const startDate = now.toISOString().split('T')[0];
      
      // Create a new date for the end date (3 months from now)
      const endDateObj = new Date();
      endDateObj.setMonth(endDateObj.getMonth() + 3);
      const endDate = endDateObj.toISOString().split('T')[0];
      
      console.log('TutorDetailScreen - Fetching availability with dates:', { startDate, endDate, tutorId: tutor.uid });
      
      const result = await getTutorAvailability(tutor.uid, startDate, endDate);
      console.log('TutorDetailScreen - Availability result:', JSON.stringify(result));
      
      if (result.success) {
        setAvailabilityData(result.availability);
        
        // Format dates for the calendar (mark dates with available slots)
        const marked = {};
        result.availability.forEach(dateData => {
          console.log('TutorDetailScreen - Date data:', JSON.stringify(dateData));
          if (dateData.slots && dateData.slots.length > 0) {
            const availableSlots = dateData.slots.filter(slot => !slot.isBooked);
            console.log('TutorDetailScreen - Available slots for', dateData.date, ':', availableSlots.length);
            if (availableSlots.length > 0) {
              marked[dateData.date] = {
                marked: true,
                dotColor: '#2196F3'
              };
            }
          }
        });
        
        setMarkedDates(marked);
      }
    } catch (error) {
      console.error('Error fetching tutor availability:', error);
      Alert.alert('Error', 'Failed to load tutor availability');
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchSubjects = async () => {
    try {
      const result = await getAllSubjects();
      if (result.success) {
        setSubjectsList(result.subjects);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };
  
  const handleDateSelect = (date) => {
    const dateString = date.dateString;
    setSelectedDate(dateString);
    
    // Find slots for the selected date
    const dateData = availabilityData.find(d => d.date === dateString);
    console.log('Selected date data:', JSON.stringify(dateData));
    
    if (dateData && dateData.slots) {
      // Filter out booked slots
      const availableSlots = dateData.slots.filter(slot => !slot.isBooked);
      console.log('Available slots after filtering:', JSON.stringify(availableSlots));
      setAvailableSlots(availableSlots);
    } else {
      setAvailableSlots([]);
    }
    
    // Clear previously selected slot
    setSelectedSlot('');
  };
  
  const handleSlotSelect = (slot) => {
    console.log('Selected slot:', JSON.stringify(slot));
    setSelectedSlot(slot.startTime);
  };
  
  const handleSubjectSelect = (subject) => {
    setSelectedSubject(subject);
  };
  
  const openBookingModal = () => {
    if (!selectedDate) {
      Alert.alert('Please select a date', 'You need to select a date to book a session.');
      return;
    }
    
    if (!selectedSlot) {
      Alert.alert('Please select a time slot', 'You need to select a time slot to book a session.');
      return;
    }
    
    if (!selectedSubject) {
      Alert.alert('Please select a subject', 'You need to select a subject for the tutoring session.');
      return;
    }
    
    setIsBookingModalVisible(true);
  };
  
  const handleBookSession = async () => {
    try {
      setIsConfirmingBooking(true);
      
      // Calculate end time (add 1 hour to start time)
      const [startHour, startMinute] = selectedSlot.split(':').map(Number);
      const endTime = `${String(startHour + 1).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;
      
      console.log('Booking session with data:', {
        tutorId: tutor.uid,
        studentId: user.uid,
        date: selectedDate,
        startTime: selectedSlot,
        endTime,
        subject: selectedSubject
      });
      
      // Book the session
      const bookingResult = await bookSession({
        tutorId: tutor.uid,
        studentId: user.uid,
        date: selectedDate,
        startTime: selectedSlot,
        endTime: endTime,
        subject: selectedSubject,
        hourlyRate: tutor.hourlyRate || 0,
        tutorName: tutor.fullName || tutor.displayName || `User ${tutor.uid.substring(0, 5)}`,
        studentName: user.fullName || user.displayName || `User ${user.uid.substring(0, 5)}`,
        tutorPhoneNumber: tutor.phoneNumber || 'Not provided'
      });
      
      if (bookingResult.success) {
        // Process payment
        const paymentResult = await processPayment(bookingResult.sessionId);
        
        if (paymentResult.success) {
          // Close modal and navigate back
          setIsBookingModalVisible(false);
          
          Alert.alert(
            'Booking Request Sent!',
            'Your session has been submitted and is awaiting tutor approval. You can view its status in My Sessions.',
            [
              { 
                text: 'View My Sessions', 
                onPress: () => navigation.navigate('SessionsTab') 
              },
              { 
                text: 'OK', 
                style: 'cancel' 
              }
            ]
          );
        } else {
          Alert.alert('Payment Error', paymentResult.error || 'Failed to process payment');
        }
      } else {
        Alert.alert('Booking Error', bookingResult.error || 'Failed to book session');
      }
    } catch (error) {
      console.error('Error booking session:', error);
      Alert.alert('Error', 'An unexpected error occurred while booking your session');
    } finally {
      setIsConfirmingBooking(false);
    }
  };
  
  const renderAvailabilityContent = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Loading availability...</Text>
        </View>
      );
    }
    
    return (
      <View style={styles.availabilityContainer}>
        <Calendar
          onDayPress={handleDateSelect}
          markedDates={{
            ...markedDates,
            [selectedDate]: {
              ...(markedDates[selectedDate] || {}),
              selected: true,
              selectedColor: '#2196F3'
            }
          }}
          minDate={new Date().toISOString().split('T')[0]}
          maxDate={new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().split('T')[0]}
          hideExtraDays={true}
          theme={{
            selectedDayBackgroundColor: '#2196F3',
            todayTextColor: '#2196F3',
            arrowColor: '#2196F3',
            dotColor: '#2196F3',
            selectedDotColor: '#ffffff',
          }}
        />
        
        {selectedDate ? (
          <View style={styles.timeSlotsContainer}>
            <Text style={styles.timeSlotsTitle}>Available time slots for {selectedDate}</Text>
            
            {!availableSlots || availableSlots.length === 0 ? (
              <Text style={styles.noSlotsText}>No available slots for this date</Text>
            ) : (
              <View style={styles.slotsGrid}>
                {availableSlots
                  .filter(slot => !slot.isBooked) // Only show slots that aren't booked
                  .map((slot, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.timeSlotButton,
                        selectedSlot === slot.startTime && styles.selectedTimeSlot
                      ]}
                      onPress={() => handleSlotSelect(slot)}
                    >
                      <Text 
                        style={[
                          styles.timeSlotText,
                          selectedSlot === slot.startTime && styles.selectedTimeSlotText
                        ]}
                      >
                        {slot.startTime}
                      </Text>
                    </TouchableOpacity>
                  ))
                }
              </View>
            )}
          </View>
        ) : (
          <Text style={styles.selectDateText}>Select a date to view available time slots</Text>
        )}
        
        <View style={styles.subjectsContainer}>
          <Text style={styles.subjectsTitle}>Subject</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {tutor.subjects?.map((subjectId) => {
              const subject = subjectsList.find(s => s.id === subjectId);
              return subject ? (
                <TouchableOpacity
                  key={subjectId}
                  style={[
                    styles.subjectChip,
                    selectedSubject === subjectId && styles.selectedSubjectChip
                  ]}
                  onPress={() => handleSubjectSelect(subjectId)}
                >
                  <Text 
                    style={[
                      styles.subjectChipText,
                      selectedSubject === subjectId && styles.selectedSubjectChipText
                    ]}
                  >
                    {subject.name}
                  </Text>
                </TouchableOpacity>
              ) : null;
            })}
          </ScrollView>
        </View>
        
        <TouchableOpacity
          style={[
            styles.bookButton,
            (!selectedDate || !selectedSlot || !selectedSubject) && styles.disabledButton
          ]}
          onPress={openBookingModal}
          disabled={!selectedDate || !selectedSlot || !selectedSubject}
        >
          <Text style={styles.bookButtonText}>Book Session</Text>
        </TouchableOpacity>
      </View>
    );
  };
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.profileHeader}>
        <View style={styles.profileImageContainer}>
          {tutor.photoURL ? (
            <Image source={{ uri: tutor.photoURL }} style={styles.profileImage} />
          ) : (
            <View style={styles.profileImagePlaceholder}>
              <Text style={styles.profileImagePlaceholderText}>
                {(tutor.fullName || tutor.displayName || `${tutor.uid?.substring(0, 1)}` || "?").charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.profileInfo}>
          <Text style={styles.tutorName}>{tutor.fullName || tutor.displayName || `User ${tutor.uid.substring(0, 5)}`}</Text>
          
          <View style={styles.ratingContainer}>
            <MaterialIcons name="star" size={16} color="#FFC107" />
            <Text style={styles.ratingText}>
              {tutor.rating?.toFixed(1) || 'New'} 
              {tutor.totalReviews > 0 && ` (${tutor.totalReviews})`}
            </Text>
          </View>
          
          <Text style={styles.hourlyRate}>${tutor.hourlyRate || 0}/hr</Text>
        </View>
      </View>
      
      {tutor.phoneNumber && (
        <View style={styles.contactCard}>
          <MaterialIcons name="phone" size={24} color="#2196F3" />
          <Text style={styles.contactText}>{tutor.phoneNumber}</Text>
        </View>
      )}
      
      <View style={styles.subjectsCard}>
        <Text style={styles.cardTitle}>Subjects</Text>
        <View style={styles.subjectsList}>
          {tutor.subjects?.map((subjectId, index) => {
            const subject = subjectsList.find(s => s.id === subjectId);
            return subject ? (
              <View key={index} style={styles.subjectBadge}>
                <Text style={styles.subjectBadgeText}>{subject.name}</Text>
              </View>
            ) : null;
          })}
        </View>
      </View>
      
      <View style={styles.availabilityCard}>
        <Text style={styles.cardTitle}>Book a Session</Text>
        {renderAvailabilityContent()}
      </View>
      
      {/* Booking Confirmation Modal */}
      <Modal
        visible={isBookingModalVisible}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm Booking</Text>
            
            <View style={styles.bookingDetails}>
              <View style={styles.bookingDetailRow}>
                <Text style={styles.bookingDetailLabel}>Tutor:</Text>
                <Text style={styles.bookingDetailValue}>{tutor.fullName || tutor.displayName || "Tutor"}</Text>
              </View>
              
              <View style={styles.bookingDetailRow}>
                <Text style={styles.bookingDetailLabel}>Subject:</Text>
                <Text style={styles.bookingDetailValue}>
                  {subjectsList.find(s => s.id === selectedSubject)?.name || 'Unknown Subject'}
                </Text>
              </View>
              
              <View style={styles.bookingDetailRow}>
                <Text style={styles.bookingDetailLabel}>Date:</Text>
                <Text style={styles.bookingDetailValue}>{selectedDate}</Text>
              </View>
              
              <View style={styles.bookingDetailRow}>
                <Text style={styles.bookingDetailLabel}>Time:</Text>
                <Text style={styles.bookingDetailValue}>{selectedSlot} - {
                  (() => {
                    const [hour, minute] = selectedSlot.split(':').map(Number);
                    return `${String(hour + 1).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
                  })()
                }</Text>
              </View>
              
              <View style={styles.bookingDetailRow}>
                <Text style={styles.bookingDetailLabel}>Price:</Text>
                <Text style={styles.bookingDetailValue}>${tutor.hourlyRate}</Text>
              </View>
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setIsBookingModalVisible(false)}
                disabled={isConfirmingBooking}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.confirmButton}
                onPress={handleBookSession}
                disabled={isConfirmingBooking}
              >
                {isConfirmingBooking ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.confirmButtonText}>Confirm & Pay</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  profileHeader: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  profileImageContainer: {
    marginRight: 20,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImagePlaceholderText: {
    fontSize: 32,
    color: '#fff',
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  tutorName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 4,
  },
  hourlyRate: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 10,
    marginHorizontal: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  contactText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  subjectsCard: {
    backgroundColor: '#fff',
    padding: 16,
    margin: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  subjectsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  subjectBadge: {
    backgroundColor: '#f0f7ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  subjectBadgeText: {
    color: '#2196F3',
    fontSize: 14,
  },
  availabilityCard: {
    backgroundColor: '#fff',
    padding: 16,
    margin: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  availabilityContainer: {
    marginTop: 8,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: '#666',
    marginTop: 8,
  },
  selectDateText: {
    textAlign: 'center',
    color: '#666',
    padding: 20,
    fontStyle: 'italic',
  },
  timeSlotsContainer: {
    marginTop: 16,
  },
  timeSlotsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  timeSlotButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f0f7ff',
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedTimeSlot: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  timeSlotText: {
    color: '#2196F3',
    fontSize: 14,
  },
  selectedTimeSlotText: {
    color: '#fff',
  },
  noSlotsText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    padding: 20,
  },
  subjectsContainer: {
    marginTop: 20,
    marginBottom: 20,
  },
  subjectsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  subjectChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f0f7ff',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedSubjectChip: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  subjectChipText: {
    color: '#2196F3',
    fontSize: 14,
  },
  selectedSubjectChipText: {
    color: '#fff',
  },
  bookButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
  bookingDetails: {
    marginBottom: 24,
  },
  bookingDetailRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  bookingDetailLabel: {
    width: 80,
    fontSize: 16,
    color: '#666',
  },
  bookingDetailValue: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
  confirmButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#2196F3',
    alignItems: 'center',
    marginLeft: 8,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default TutorDetailScreen; 