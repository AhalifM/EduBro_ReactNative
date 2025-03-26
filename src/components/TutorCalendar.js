import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { addAvailabilitySlot, removeAvailabilitySlot, getTutorAvailability } from '../utils/tutorUtils';
import { useAuth } from '../contexts/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Card } from 'react-native-paper';

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
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  
  // Get tutor's availability for the current month
  const fetchAvailability = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      setIsLoading(true);
      
      // Get start of current month and end of next month
      const [year, month] = currentMonth.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month + 1, 0);
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      const result = await getTutorAvailability(user.uid, startDateStr, endDateStr);
      
      if (result.success) {
        const availabilityData = result.availability;
        
        // Format dates for the calendar - use functional update to avoid race conditions
        setMarkedDates(prevMarkedDates => {
          const marked = { ...prevMarkedDates };
          
          availabilityData.forEach(dateData => {
            marked[dateData.date] = {
              marked: true,
              dotColor: '#2196F3',
              selected: dateData.date === selectedDate,
              selectedColor: dateData.date === selectedDate ? '#E6F0FA' : undefined
            };
          });
          
          return marked;
        });
        
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
  }, [user?.uid, selectedDate, currentMonth]);
  
  // Use useFocusEffect to refetch data only when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchAvailability();
      
      return () => {
        // Clean up function if needed
      };
    }, [fetchAvailability])
  );
  
  // Handle month change in calendar
  const handleMonthChange = useCallback((month) => {
    const newMonth = `${month.year}-${String(month.month).padStart(2, '0')}`;
    if (newMonth !== currentMonth) {
      setCurrentMonth(newMonth);
    }
  }, [currentMonth]);
  
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
    
    // Validate date is not in the past
    const selectedDateObj = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDateObj < today) {
      Alert.alert('Invalid Date', 'You cannot select dates in the past');
      return;
    }
    
    setSelectedDate(dateString);
    
    // Update selected date in marked dates - use functional update
    setMarkedDates(prevMarkedDates => {
      const newMarkedDates = { ...prevMarkedDates };
      
      // Reset previous selection
      Object.keys(newMarkedDates).forEach(key => {
        if (newMarkedDates[key]?.selected) {
          newMarkedDates[key] = { 
            ...newMarkedDates[key], 
            selected: false 
          };
        }
      });
      
      // Add new selection
      newMarkedDates[dateString] = {
        ...(newMarkedDates[dateString] || {}),
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
        // Refresh slots for the selected date - use functional updates
        setAvailableSlots(prevSlots => {
          if (isSlotAvailable) {
            // Remove the slot
            return prevSlots.filter(slot => slot.startTime !== timeSlot);
          } else {
            // Add the slot
            return [...prevSlots, { 
              startTime: timeSlot, 
              endTime: endTime, 
              isBooked: false 
            }];
          }
        });
        
        // Update calendar dots - use functional updates
        setMarkedDates(prevMarkedDates => {
          const newMarkedDates = { ...prevMarkedDates };
          
          if (!isSlotAvailable) {
            // If adding a slot to a date
            newMarkedDates[selectedDate] = {
              ...(prevMarkedDates[selectedDate] || {}),
              marked: true,
              dotColor: '#2196F3',
              selected: true,
              selectedColor: '#E6F0FA'
            };
          } else if (availableSlots.length === 1) {
            // If removing the last slot, unmark the date but keep it selected
            newMarkedDates[selectedDate] = {
              selected: true,
              selectedColor: '#E6F0FA'
            };
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
  }, [availableSlots, selectedDate, user?.uid]);
  
  // Memoize the time slots rendering
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
          <Text style={[
            styles.timeSlotText,
            isAvailable ? styles.availableSlotText : styles.unavailableSlotText
          ]}>
            {slot}
          </Text>
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

  // Memoize the calendar theme for better performance
  const calendarTheme = useMemo(() => ({
    backgroundColor: 'transparent',
    calendarBackground: 'transparent',
    textSectionTitleColor: '#1F2937',
    selectedDayBackgroundColor: '#2563EB',
    selectedDayTextColor: '#FFFFFF',
    todayTextColor: '#2563EB',
    todayBackgroundColor: '#E0F2FE',
    dayTextColor: '#4B5563',
    textDisabledColor: '#CBD5E1',
    dotColor: '#2563EB',
    selectedDotColor: '#FFFFFF',
    arrowColor: '#2563EB',
    monthTextColor: '#1F2937',
    textMonthFontWeight: 'bold',
    textDayFontSize: 14,
    textMonthFontSize: 16,
    textDayHeaderFontSize: 14,
    'stylesheet.calendar.header': {
      header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 10,
      },
      monthText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
      },
    }
  }), []);

  // Memoize min and max date
  const minDate = useMemo(() => new Date().toISOString().split('T')[0], []);
  const maxDate = useMemo(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + 3);
    return date.toISOString().split('T')[0];
  }, []);

  return (
    <View style={styles.container}>
      <Card style={styles.calendarCard}>
        <View style={styles.calendarHeader}>
          <Text style={styles.calendarHeaderText}>
            Select a date to set your available time slots
          </Text>
        </View>
        
        <View style={styles.calendarWrapper}>
          <Calendar
            current={selectedDate || undefined}
            markedDates={markedDates}
            onDayPress={handleDateSelect}
            onMonthChange={handleMonthChange}
            theme={calendarTheme}
            hideExtraDays={false}
            hideArrows={false}
            enableSwipeMonths={true}
            markingType={'simple'}
            minDate={minDate}
            maxDate={maxDate}
            disableAllTouchEventsForDisabledDays={true}
          />
        </View>
      </Card>
      
      {selectedDate ? (
        <Card style={styles.timeSlotsCard}>
          <View style={styles.selectedDateHeader}>
            <View style={styles.selectedDateTextContainer}>
              <MaterialIcons name="event" size={20} color="#2563EB" style={styles.selectedDateIcon} />
              <Text style={styles.selectedDateText}>
                {new Date(selectedDate).toDateString()}
              </Text>
            </View>
            
            {isLoading && (
              <ActivityIndicator size="small" color="#2563EB" style={styles.loadingIndicator} />
            )}
          </View>
          
          <Text style={styles.instructionText}>
            Tap on time slots to toggle your availability
          </Text>
          
          <ScrollView 
            style={styles.timeSlotScrollView}
            contentContainerStyle={styles.timeSlotContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.timeSlotsContainer}>
              {TIME_SLOTS.map((slot) => {
                // Find if slot exists in availableSlots and is not booked
                const slotObj = availableSlots.find(s => s.startTime === slot);
                const isAvailable = slotObj && !slotObj.isBooked;
                const isBooked = slotObj && slotObj.isBooked;
                
                return (
                  <TouchableOpacity
                    key={slot}
                    style={[
                      styles.timeSlot,
                      isAvailable && styles.availableSlot,
                      isBooked && styles.bookedSlot,
                      !isAvailable && !isBooked && styles.unavailableSlot
                    ]}
                    onPress={() => handleSlotToggle(slot)}
                    disabled={isLoading || isBooked}
                  >
                    <Text style={[
                      styles.timeSlotText,
                      isAvailable && styles.availableSlotText,
                      isBooked && styles.bookedSlotText,
                      !isAvailable && !isBooked && styles.unavailableSlotText
                    ]}>
                      {slot}
                    </Text>
                    
                    {isAvailable && (
                      <MaterialIcons name="check-circle" size={18} color="#10B981" style={styles.slotIcon} />
                    )}
                    
                    {isBooked && (
                      <MaterialIcons name="event-busy" size={18} color="#F43F5E" style={styles.slotIcon} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
          
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.legendText}>Available</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#F43F5E' }]} />
              <Text style={styles.legendText}>Booked</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#E5E7EB' }]} />
              <Text style={styles.legendText}>Unavailable</Text>
            </View>
          </View>
        </Card>
      ) : (
        <Card style={styles.noDateCard}>
          <MaterialIcons name="calendar-today" size={40} color="#6B7280" style={styles.noDateIcon} />
          <Text style={styles.noDateText}>
            Select a date to set your availability
          </Text>
        </Card>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  calendarCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  calendarWrapper: {
    padding: 12,
  },
  calendarHeader: {
    backgroundColor: '#E0F2FE', 
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  calendarHeaderText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    textAlign: 'center',
  },
  timeSlotsCard: {
    borderRadius: 16,
    overflow: 'hidden',
    padding: 20,
    elevation: 3,
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  selectedDateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  selectedDateTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedDateIcon: {
    marginRight: 10,
  },
  selectedDateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  loadingIndicator: {
    marginLeft: 8,
  },
  instructionText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    textAlign: 'center',
  },
  timeSlotScrollView: {
    maxHeight: 320,
  },
  timeSlotContent: {
    paddingBottom: 12,
  },
  timeSlotsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  timeSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '45%',
    padding: 14,
    margin: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  unavailableSlot: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
  },
  availableSlot: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  bookedSlot: {
    backgroundColor: '#FFF1F2',
    borderColor: '#F43F5E',
  },
  timeSlotText: {
    fontSize: 16,
    fontWeight: '500',
  },
  unavailableSlotText: {
    color: '#6B7280',
  },
  availableSlotText: {
    color: '#10B981',
  },
  bookedSlotText: {
    color: '#F43F5E',
  },
  slotIcon: {
    marginLeft: 8,
  },
  noDateCard: {
    borderRadius: 16,
    overflow: 'hidden',
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  noDateIcon: {
    marginBottom: 20,
  },
  noDateText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    color: '#4B5563',
  },
});

export default TutorCalendar; 