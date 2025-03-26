import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Image, 
  TextInput,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { getAllTutors, getAllSubjects, getTutorAvailability } from '../../utils/tutorUtils';
import { getCurrentUser } from '../../utils/auth';
import { SafeAreaView } from 'react-native-safe-area-context';
import TutorFilterModal from '../../components/TutorFilterModal';
import { format } from 'date-fns';

const FindTutorScreen = ({ navigation }) => {
  const [tutors, setTutors] = useState([]);
  const [filteredTutors, setFilteredTutors] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    subject: null,
    minRating: 0,
    maxPrice: 100,
    minPrice: 0,
    date: null
  });
  const [tutorAvailability, setTutorAvailability] = useState({});
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    fetchTutorsAndSubjects();
    fetchCurrentUser();
    
    // Add focus listener to refresh data when screen is focused
    const unsubscribe = navigation.addListener('focus', () => {
      fetchTutorsAndSubjects();
      fetchCurrentUser();
    });

    // Cleanup the listener on unmount
    return unsubscribe;
  }, [navigation]);

  const fetchTutorsAndSubjects = async () => {
    setIsLoading(true);
    try {
      // Fetch tutors
      const tutorsResult = await getAllTutors();
      if (tutorsResult.success) {
        setTutors(tutorsResult.tutors);
        setFilteredTutors(tutorsResult.tutors);
      }

      // Fetch subjects
      const subjectsResult = await getAllSubjects();
      if (subjectsResult.success) {
        setSubjects(subjectsResult.subjects);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const userData = await getCurrentUser();
      if (userData) {
        setCurrentUser(userData);
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  // Fetch availability for a specific date
  const fetchAvailabilityForDate = async (date) => {
    if (!date) return;

    setIsLoading(true);
    try {
      const formattedDate = format(date, 'yyyy-MM-dd');
      const availabilityData = {};

      // For each tutor, fetch availability for the selected date
      await Promise.all(
        tutors.map(async (tutor) => {
          const result = await getTutorAvailability(tutor.uid, formattedDate, formattedDate);
          if (result.success && result.availability.length > 0) {
            availabilityData[tutor.uid] = result.availability;
          }
        })
      );

      setTutorAvailability(availabilityData);
    } catch (error) {
      console.error('Error fetching availability:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle pull-to-refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchTutorsAndSubjects();
    
    // If date filter is active, refresh availability data too
    if (activeFilters.date) {
      fetchAvailabilityForDate(activeFilters.date);
    }
  };

  // Apply filters when search query or active filters change
  useEffect(() => {
    filterTutors();
  }, [searchQuery, activeFilters, tutors, tutorAvailability]);

  // If date filter is changed, fetch availability for that date
  useEffect(() => {
    if (activeFilters.date) {
      fetchAvailabilityForDate(activeFilters.date);
    }
  }, [activeFilters.date]);

  const filterTutors = () => {
    let filtered = [...tutors];

    // Filter by search query (tutor name)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(tutor => {
        const tutorName = (tutor.fullName || tutor.displayName || "").toLowerCase();
        return tutorName.includes(query);
      });
    }

    // Filter by selected subject
    if (activeFilters.subject) {
      filtered = filtered.filter(tutor => 
        tutor.subjects && tutor.subjects.includes(activeFilters.subject.id)
      );
    } 
    // If no subject filter is active but the student has interests, filter by their interests
    else if (currentUser?.interestedSubjects && currentUser.interestedSubjects.length > 0) {
      filtered = filtered.filter(tutor => 
        tutor.subjects && tutor.subjects.some(subjectId => 
          currentUser.interestedSubjects.includes(subjectId)
        )
      );
    }

    // Filter by minimum rating
    if (activeFilters.minRating > 0) {
      filtered = filtered.filter(tutor => 
        tutor.rating && tutor.rating >= activeFilters.minRating
      );
    }

    // Filter by price range
    if (activeFilters.minPrice > 0 || activeFilters.maxPrice < 100) {
      filtered = filtered.filter(tutor => {
        const price = tutor.hourlyRate || 0;
        return price >= activeFilters.minPrice && price <= activeFilters.maxPrice;
      });
    }

    // Filter by availability on selected date
    if (activeFilters.date && Object.keys(tutorAvailability).length > 0) {
      filtered = filtered.filter(tutor => 
        tutorAvailability[tutor.uid] && 
        tutorAvailability[tutor.uid].some(avail => 
          avail.slots && avail.slots.some(slot => !slot.isBooked)
        )
      );
    }

    setFilteredTutors(filtered);
  };

  const handleApplyFilters = (filters) => {
    setActiveFilters(filters);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (activeFilters.subject) count++;
    if (activeFilters.minRating > 0) count++;
    if (activeFilters.minPrice > 0 || activeFilters.maxPrice < 100) count++;
    if (activeFilters.date) count++;
    return count;
  };

  const handleTutorSelect = (tutor) => {
    navigation.navigate('TutorDetail', { tutor });
  };

  const renderTutorItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.tutorCard}
      onPress={() => handleTutorSelect(item)}
    >
      <View style={styles.tutorAvatarContainer}>
        {item.photoURL ? (
          <Image source={{ uri: item.photoURL }} style={styles.tutorAvatar} />
        ) : (
          <View style={styles.tutorAvatarPlaceholder}>
            <Text style={styles.tutorAvatarPlaceholderText}>
              {(item.fullName || item.displayName || "T").charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.tutorInfo}>
        <Text style={styles.tutorName}>{item.fullName || item.displayName || "Tutor"}</Text>
        
        <View style={styles.ratingContainer}>
          <MaterialIcons name="star" size={16} color="#FFC107" />
          <Text style={styles.ratingText}>
            {item.rating?.toFixed(1) || 'New'} 
            {item.totalReviews > 0 && ` (${item.totalReviews})`}
          </Text>
        </View>
        
        <View style={styles.subjectsContainer}>
          {item.subjects?.slice(0, 3).map((subjectId, index) => {
            // Find subject object by ID
            const subject = subjects.find(s => s.id === subjectId);
            return subject ? (
              <View key={index} style={styles.subjectTag}>
                <Text style={styles.subjectTagText}>{subject.name}</Text>
              </View>
            ) : null;
          })}
          {item.subjects?.length > 3 && (
            <Text style={styles.moreSubjectsText}>+{item.subjects.length - 3}</Text>
          )}
        </View>
        
        <Text style={styles.hourlyRate}>${item.hourlyRate || 0}/hr</Text>
      </View>
      
      <MaterialIcons name="chevron-right" size={24} color="#999" />
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loaderText}>Loading tutors...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <MaterialIcons name="search" size={24} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by tutor name"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialIcons name="clear" size={20} color="#999" />
              </TouchableOpacity>
            ) : null}
          </View>
          
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setFilterModalVisible(true)}
          >
            <MaterialIcons name="filter-list" size={24} color="#2196F3" />
            {getActiveFilterCount() > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{getActiveFilterCount()}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        
        {getActiveFilterCount() > 0 && (
          <View style={styles.activeFiltersContainer}>
            <Text style={styles.activeFiltersTitle}>Active Filters:</Text>
            <View style={styles.activeFiltersContent}>
              {activeFilters.subject && (
                <View style={styles.activeFilterChip}>
                  <Text style={styles.activeFilterChipText}>
                    Subject: {activeFilters.subject.name}
                  </Text>
                </View>
              )}
              {activeFilters.minRating > 0 && (
                <View style={styles.activeFilterChip}>
                  <Text style={styles.activeFilterChipText}>
                    Rating: {activeFilters.minRating}+
                  </Text>
                </View>
              )}
              {(activeFilters.minPrice > 0 || activeFilters.maxPrice < 100) && (
                <View style={styles.activeFilterChip}>
                  <Text style={styles.activeFilterChipText}>
                    Price: ${activeFilters.minPrice}-${activeFilters.maxPrice}/hr
                  </Text>
                </View>
              )}
              {activeFilters.date && (
                <View style={styles.activeFilterChip}>
                  <Text style={styles.activeFilterChipText}>
                    Available: {format(activeFilters.date, 'MMM d, yyyy')}
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity 
              style={styles.clearFiltersButton}
              onPress={() => setActiveFilters({
                subject: null,
                minRating: 0,
                maxPrice: 100,
                minPrice: 0,
                date: null
              })}
            >
              <Text style={styles.clearFiltersText}>Clear All</Text>
            </TouchableOpacity>
          </View>
        )}

        {filteredTutors.length === 0 ? (
          <View style={styles.noResultsContainer}>
            <MaterialIcons name="search-off" size={60} color="#ccc" />
            <Text style={styles.noResultsText}>No tutors found</Text>
            <Text style={styles.noResultsSubtext}>
              Try adjusting your search or filters
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredTutors}
            renderItem={renderTutorItem}
            keyExtractor={(item) => item.uid}
            contentContainerStyle={styles.tutorsList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#2196F3']}
                tintColor={'#2196F3'}
              />
            }
          />
        )}

        <TutorFilterModal 
          isVisible={filterModalVisible} 
          onClose={() => setFilterModalVisible(false)}
          onApplyFilters={handleApplyFilters}
          subjects={subjects}
          initialFilters={activeFilters}
        />
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginRight: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    paddingVertical: 8,
  },
  filterButton: {
    position: 'relative',
    padding: 8,
  },
  filterBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FF5722',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  activeFiltersContainer: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#b3e5fc',
  },
  activeFiltersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
    marginBottom: 8,
  },
  activeFiltersContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  activeFilterChip: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  activeFilterChipText: {
    color: '#2196F3',
    fontSize: 12,
  },
  clearFiltersButton: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  clearFiltersText: {
    color: '#F44336',
    fontSize: 12,
    fontWeight: '600',
  },
  subjectsFilter: {
    backgroundColor: '#fff',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
  },
  tutorsList: {
    padding: 12,
  },
  tutorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tutorAvatarContainer: {
    marginRight: 16,
  },
  tutorAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f2f2f2',
  },
  tutorAvatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tutorAvatarPlaceholderText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  tutorInfo: {
    flex: 1,
  },
  tutorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  ratingText: {
    marginLeft: 4,
    color: '#666',
    fontSize: 14,
  },
  subjectsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 6,
  },
  subjectTag: {
    backgroundColor: '#f0f7ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
    marginBottom: 4,
  },
  subjectTagText: {
    fontSize: 12,
    color: '#2196F3',
  },
  moreSubjectsText: {
    fontSize: 12,
    color: '#999',
    alignSelf: 'center',
  },
  hourlyRate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  loaderText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default FindTutorScreen; 