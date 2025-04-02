import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Switch,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';

const TutorFilterModal = ({ visible, onClose, onApplyFilters, subjects, initialFilters = {} }) => {
  const [filters, setFilters] = useState({
    subject: null,
    minRating: 0,
    maxPrice: 100,
    minPrice: 0,
    date: null,
    ...initialFilters
  });

  const [showDatePicker, setShowDatePicker] = useState(false);

  // Reset filters when modal is opened with new initialFilters
  useEffect(() => {
    if (visible) {
      setFilters({
        subject: null,
        minRating: 0,
        maxPrice: 100,
        minPrice: 0,
        date: null,
        ...initialFilters
      });
    }
  }, [visible]);

  const handleSubjectSelect = (subject) => {
    setFilters(prev => ({
      ...prev,
      subject: prev.subject?.id === subject.id ? null : subject
    }));
  };

  const handleRatingChange = (value) => {
    setFilters(prev => ({
      ...prev,
      minRating: value
    }));
  };

  const handlePriceRangeChange = (type, value) => {
    if (type === 'min') {
      setFilters(prev => ({
        ...prev,
        minPrice: Math.min(value, prev.maxPrice)
      }));
    } else {
      setFilters(prev => ({
        ...prev,
        maxPrice: Math.max(value, prev.minPrice)
      }));
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFilters(prev => ({
        ...prev,
        date: selectedDate
      }));
    }
  };

  const handleClearFilters = () => {
    setFilters({
      subject: null,
      minRating: 0,
      maxPrice: 100,
      minPrice: 0,
      date: null
    });
  };

  const handleApplyFilters = () => {
    onApplyFilters(filters);
    onClose();
  };

  const areFiltersActive = () => {
    return (
      filters.subject !== null ||
      filters.minRating > 0 ||
      filters.minPrice > 0 ||
      filters.maxPrice < 100 ||
      filters.date !== null
    );
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1 }}>
            <TouchableOpacity 
              style={styles.modalOverlay} 
              activeOpacity={1} 
              onPress={onClose}
            >
              <TouchableOpacity 
                style={styles.modalContent} 
                activeOpacity={1} 
                onPress={(e) => e.stopPropagation()}
              >
                <TouchableOpacity 
                  style={styles.closeBarButton} 
                  onPress={onClose}
                  accessibilityLabel="Close filter panel"
                >
                  <View style={styles.closeBar}></View>
                </TouchableOpacity>
                
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Filter Tutors</Text>
                  <TouchableOpacity onPress={onClose} style={styles.closeButton} accessibilityLabel="Close filter panel">
                    <MaterialIcons name="close" size={24} color="#333" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.filtersContainer}>
                  {/* Subject Filter */}
                  <View style={styles.filterSection}>
                    <Text style={styles.filterTitle}>Subject</Text>
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.subjectContainer}
                    >
                      {subjects?.map((subject) => (
                        <TouchableOpacity
                          key={subject.id}
                          style={[
                            styles.subjectChip,
                            filters.subject?.id === subject.id && styles.selectedSubjectChip
                          ]}
                          onPress={() => handleSubjectSelect(subject)}
                        >
                          <Text 
                            style={[
                              styles.subjectChipText,
                              filters.subject?.id === subject.id && styles.selectedSubjectChipText
                            ]}
                          >
                            {subject.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  {/* Rating Filter */}
                  <View style={styles.filterSection}>
                    <View style={styles.filterHeader}>
                      <Text style={styles.filterTitle}>Minimum Rating</Text>
                      <Text style={styles.filterValue}>{filters.minRating.toFixed(1)}+</Text>
                    </View>
                    <Slider
                      style={styles.slider}
                      minimumValue={0}
                      maximumValue={5}
                      step={0.5}
                      value={filters.minRating}
                      onValueChange={handleRatingChange}
                      minimumTrackTintColor="#2196F3"
                      maximumTrackTintColor="#D1D1D1"
                      thumbTintColor="#2196F3"
                    />
                    <View style={styles.sliderLabels}>
                      <Text style={styles.sliderLabel}>Any</Text>
                      <Text style={styles.sliderLabel}>5.0</Text>
                    </View>
                  </View>

                  {/* Price Range Filter */}
                  <View style={styles.filterSection}>
                    <Text style={styles.filterTitle}>Price Range ($/hr)</Text>
                    <View style={styles.priceInputsContainer}>
                      <View style={styles.priceInputWrapper}>
                        <Text style={styles.priceInputLabel}>Min</Text>
                        <TextInput
                          style={styles.priceInput}
                          value={filters.minPrice.toString()}
                          onChangeText={(text) => handlePriceRangeChange('min', parseInt(text) || 0)}
                          keyboardType="numeric"
                        />
                      </View>
                      <Text style={styles.priceSeparator}>-</Text>
                      <View style={styles.priceInputWrapper}>
                        <Text style={styles.priceInputLabel}>Max</Text>
                        <TextInput
                          style={styles.priceInput}
                          value={filters.maxPrice.toString()}
                          onChangeText={(text) => handlePriceRangeChange('max', parseInt(text) || 0)}
                          keyboardType="numeric"
                        />
                      </View>
                    </View>
                  </View>

                  {/* Date Filter */}
                  <View style={styles.filterSection}>
                    <Text style={styles.filterTitle}>Available On Date</Text>
                    <TouchableOpacity
                      style={styles.datePickerButton}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <MaterialIcons name="event" size={20} color="#2196F3" />
                      <Text style={styles.dateButtonText}>
                        {filters.date ? format(filters.date, 'MMMM d, yyyy') : 'Select a date'}
                      </Text>
                      {filters.date && (
                        <TouchableOpacity
                          style={styles.clearDateButton}
                          onPress={() => setFilters(prev => ({ ...prev, date: null }))}
                        >
                          <MaterialIcons name="close" size={16} color="#666" />
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>
                    {showDatePicker && (
                      <DateTimePicker
                        value={filters.date || new Date()}
                        mode="date"
                        display="default"
                        onChange={handleDateChange}
                        minimumDate={new Date()}
                      />
                    )}
                  </View>
                  
                  {/* Add extra padding at bottom for better scrolling with keyboard */}
                  <View style={{ height: 120 }} />
                </ScrollView>

                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={handleClearFilters}
                    disabled={!areFiltersActive()}
                  >
                    <Text style={[
                      styles.clearButtonText,
                      !areFiltersActive() && styles.disabledButtonText
                    ]}>
                      Clear All
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.exitButton}
                    onPress={onClose}
                  >
                    <Text style={styles.exitButtonText}>Exit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.applyButton}
                    onPress={handleApplyFilters}
                  >
                    <Text style={styles.applyButtonText}>Apply Filters</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    height: Platform.OS === 'ios' ? '80%' : '90%',
    maxHeight: Platform.OS === 'ios' ? 600 : '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeBarButton: {
    width: '100%',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 10,
  },
  closeBar: {
    width: 40,
    height: 5,
    backgroundColor: '#DDDDDD',
    borderRadius: 2.5,
  },
  closeButton: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: '#f2f2f2',
  },
  filtersContainer: {
    flex: 1,
    padding: 16,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  filterValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196F3',
  },
  subjectContainer: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    paddingVertical: 4,
  },
  subjectChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f2f2f2',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedSubjectChip: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  subjectChipText: {
    fontSize: 14,
    color: '#666',
  },
  selectedSubjectChipText: {
    color: '#fff',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#999',
  },
  priceInputsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  priceInputWrapper: {
    flex: 1,
  },
  priceInputLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  priceInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 8,
    fontSize: 16,
  },
  priceSeparator: {
    paddingHorizontal: 16,
    fontSize: 18,
    color: '#999',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  dateButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  clearDateButton: {
    padding: 4,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  clearButton: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    color: '#666',
  },
  exitButton: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF5252',
    borderRadius: 8,
    marginHorizontal: 8,
  },
  exitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  disabledButtonText: {
    color: '#ccc',
  },
  applyButton: {
    flex: 2,
    backgroundColor: '#2196F3',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default TutorFilterModal; 