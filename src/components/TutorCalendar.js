import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { addAvailabilitySlot, removeAvailabilitySlot, getTutorAvailability } from '../utils/tutorUtils';
import { useAuth } from '../contexts/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', 
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
];

const TutorCalendar = React.memo(({ navigation }) => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState('');
  const [markedDates, setMarkedDates] = useState({});
  const [availableSlots, setAvailableSlots] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Get tutor's availability for the current month - memoize the function to prevent recreating on every render
  const fetchAvailability = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      setIsLoading(true);
      
      // Get start of current month and end of next month
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0);
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      const result = await getTutorAvailability(user.uid, startDateStr, endDateStr);
      
      if (result.success) {
        const availabilityData = result.availability;
        
        // Format dates for the calendar
        const marked = {};
        
        availabilityData.forEach(dateData => {
          marked[dateData.date] = {
            marked: true,
            dotColor: '#2196F3',
            selected: dateData.date === selectedDate
          };
        });
        
        setMarkedDates(marked);
        
        // If we have a selected date, update its slots
        if (selectedDate) {
          const dateData = availabilityData.find(d => d.date === selectedDate);
          setAvailableSlots(dateData ? dateData.slots : []);
        }
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
      Alert.alert('Error', 'Failed to load availability data');
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, selectedDate]);
  
  // Use useFocusEffect to refetch data only when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchAvailability();
    }, [fetchAvailability])
  );
  
  const fetchSlotsForDate = useCallback(async (date) => {
    if (!user?.uid) return;
    
    try {
      setIsLoading(true);
      
      const result = await getTutorAvailability(user.uid, date, date);
      
      if (result.success) {
        const dateData = result.availability.find(d => d.date === date);
        setAvailableSlots(dateData ? dateData.slots : []);
      } else {
        setAvailableSlots([]);
      }
    } catch (error) {
      console.error('Error fetching slots for date:', error);
      setAvailableSlots([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid]);
  
  const handleDateSelect = useCallback((date) => {
    const dateString = date.dateString;
    setSelectedDate(dateString);
    
    // Update selected date in marked dates
    setMarkedDates(prevMarkedDates => {
      const newMarkedDates = { ...prevMarkedDates };
      
      // Reset previous selection
      Object.keys(newMarkedDates).forEach(key => {
        if (newMarkedDates[key].selected) {
          newMarkedDates[key] = { 
            ...newMarkedDates[key], 
            selected: false 
          };
        }
      });
      
      // Add new selection
      newMarkedDates[dateString] = {
        ...((newMarkedDates[dateString] || {})),
        marked: true,
        dotColor: '#2196F3',
        selected: true,
        selectedColor: '#E6F0FA'
      };
      
      return newMarkedDates;
    });
    
    // Fetch slots for this date
    fetchSlotsForDate(dateString);
  }, [fetchSlotsForDate]);
  
  const handleSlotToggle = useCallback(async (timeSlot) => {
    if (!selectedDate || !user?.uid) {
      Alert.alert('Error', 'Please select a date first');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Parse the timeSlot to get the hour
      const hour = parseInt(timeSlot.split(':')[0]);
      const nextHour = hour + 1;
      const endTime = `${nextHour.toString().padStart(2, '0')}:00`;
      
      // Check if the current slot is available by looking through the available slots array
      const slotObj = availableSlots.find(slot => slot.startTime === timeSlot);
      const isSlotAvailable = !!slotObj;
      
      let result;
      
      if (isSlotAvailable) {
        // Remove the slot (passing startTime and endTime separately)
        result = await removeAvailabilitySlot(user.uid, selectedDate, timeSlot, endTime);
      } else {
        // Add the slot (passing startTime and endTime separately)
        result = await addAvailabilitySlot(user.uid, selectedDate, timeSlot, endTime);
      }
      
      if (result.success) {
        // Refresh slots for the selected date
        fetchSlotsForDate(selectedDate);
        
        // Update calendar dots - use functional updates to avoid stale state
        setMarkedDates(prevMarkedDates => {
          const newMarkedDates = { ...prevMarkedDates };
          
          if (!isSlotAvailable && !prevMarkedDates[selectedDate]) {
            // If adding first slot to a date, mark the date
            newMarkedDates[selectedDate] = {
              marked: true,
              dotColor: '#2196F3',
              selected: true,
              selectedColor: '#E6F0FA'
            };
          } else if (isSlotAvailable && availableSlots.length === 1) {
            // If removing the last slot, unmark the date
            delete newMarkedDates[selectedDate];
          }
          
          return newMarkedDates;
        });
      } else {
        Alert.alert('Error', result.error || 'Failed to update availability');
      }
    } catch (error) {
      console.error('Error toggling availability slot:', error);
      Alert.alert('Error', 'Failed to update availability');
    } finally {
      setIsLoading(false);
    }
  }, [availableSlots, selectedDate, user?.uid, fetchSlotsForDate]);
  
  // Memoize the time slots rendering to prevent unnecessary recalculations
  const timeSlots = useMemo(() => {
    return TIME_SLOTS.map((slot) => {
      // Find if slot exists in availableSlots and is not booked
      const slotObj = availableSlots.find(s => s.startTime === slot);
      const isAvailable = slotObj && !slotObj.isBooked;
      
      return (
        <TouchableOpacity
          key={slot}
          style={[
            styles.timeSlot,
            isAvailable ? styles.availableSlot : styles.unavailableSlot
          ]}
          onPress={() => handleSlotToggle(slot)}
          disabled={isLoading || (slotObj && slotObj.isBooked)}
        >
          <Text style={styles.timeSlotText}>{slot}</Text>
          {isAvailable && (
            <MaterialIcons name="check" size={20} color="#fff" />
          )}
          {slotObj && slotObj.isBooked && (
            <Text style={styles.bookedText}>Booked</Text>
          )}
        </TouchableOpacity>
      );
    });
  }, [availableSlots, isLoading, handleSlotToggle]);

  // Memoize the calendar theme to prevent recreating on every render
  const calendarTheme = useMemo(() => ({
    selectedDayBackgroundColor: '#2196F3',
    todayTextColor: '#2196F3',
    arrowColor: '#2196F3',
  }), []);

  // Memoize min and max date to prevent recalculation on every render
  const minDate = useMemo(() => new Date().toISOString().split('T')[0], []);
  const maxDate = useMemo(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + 3);
    return date.toISOString().split('T')[0];
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Set Your Availability</Text>
      <Calendar
        onDayPress={handleDateSelect}
        markedDates={markedDates}
        minDate={minDate}
        maxDate={maxDate}
        hideExtraDays={true}
        enableSwipeMonths={true}
        theme={calendarTheme}
      />
      
      {selectedDate ? (
        <View style={styles.selectedDateContainer}>
          <Text style={styles.selectedDateText}>
            Time slots for {selectedDate}
          </Text>
          {isLoading ? (
            <Text style={styles.loadingText}>Loading...</Text>
          ) : (
            <ScrollView 
              style={styles.timeSlotsContainer}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.timeSlotsContentContainer}
            >
              {timeSlots}
            </ScrollView>
          )}
        </View>
      ) : (
        <View style={styles.noDateContainer}>
          <Text style={styles.noDateText}>Select a date to set your availability</Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  selectedDateContainer: {
    marginTop: 20,
    flex: 1,
  },
  selectedDateText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  timeSlotsContainer: {
    flex: 1,
  },
  timeSlotsContentContainer: {
    paddingBottom: 20,
  },
  timeSlot: {
    padding: 16,
    marginVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  availableSlot: {
    backgroundColor: '#2196F3',
  },
  unavailableSlot: {
    backgroundColor: '#f0f0f0',
  },
  timeSlotText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  noDateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  bookedText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
});

export default TutorCalendar; 