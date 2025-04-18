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
  RefreshControl,
  Platform
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { getAllTutors, getAllSubjects, getTutorAvailability } from '../../utils/tutorUtils';
import { getCurrentUser, isValidImageUrl } from '../../utils/auth';
import { SafeAreaView } from 'react-native-safe-area-context';
import TutorFilterModal from '../../components/TutorFilterModal';
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Button } from 'react-native-paper';

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
  const [avatarErrors, setAvatarErrors] = useState({});

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

  const handleImageError = (tutorId) => {
    setAvatarErrors(prev => ({
      ...prev,
      [tutorId]: true
    }));
  };

  const getProfileImageSource = (tutor) => {
    if (tutor?.photoURL && 
        isValidImageUrl(tutor.photoURL) && 
        !avatarErrors[tutor.uid]) {
      return { uri: tutor.photoURL };
    }
    return require('../../../assets/icon.png');
  };

  const renderTutorItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.tutorCard}
      onPress={() => handleTutorSelect(item)}
    >
      <View style={styles.cardContent}>
        <View style={styles.tutorAvatarContainer}>
          <Image 
            source={getProfileImageSource(item)} 
            style={styles.tutorAvatar} 
            onError={() => handleImageError(item.uid)}
          />
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
          
          <View style={styles.priceContainer}>
            <MaterialIcons name="attach-money" size={16} color="#4CAF50" />
            <Text style={styles.priceText}>${item.hourlyRate || 0}/hr</Text>
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
              <View style={styles.moreSubjectsTag}>
                <Text style={styles.moreSubjectsText}>+{item.subjects.length - 3}</Text>
              </View>
            )}
          </View>
        </View>
        
        <MaterialIcons name="chevron-right" size={24} color="#9C27B0" style={styles.cardArrow} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <StatusBar style="light" />
      
      <View style={styles.headerContainer}>
        <LinearGradient
          colors={['#9C27B0', '#E91E63']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0.7 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Find Tutors</Text>
            <Text style={styles.headerSubtitle}>Connect with expert tutors</Text>
          </View>
        </LinearGradient>
      </View>
      
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <MaterialIcons name="search" size={24} color="#9E9E9E" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by tutor name"
            placeholderTextColor="#9E9E9E"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcons name="close" size={20} color="#9E9E9E" />
            </TouchableOpacity>
          ) : null}
        </View>
        
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setFilterModalVisible(true)}
        >
          <MaterialIcons name="filter-list" size={24} color="#9C27B0" />
          {getActiveFilterCount() > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{getActiveFilterCount()}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      
      {isLoading && tutors.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#9C27B0" />
          <Text style={styles.loadingText}>Loading tutors...</Text>
        </View>
      ) : (
        <>
          {activeFilters.subject && (
            <View style={styles.activeFilterContainer}>
              <Text style={styles.activeFilterLabel}>Subject:</Text>
              <View style={styles.activeFilterBadge}>
                <Text style={styles.activeFilterText}>{activeFilters.subject.name}</Text>
                <TouchableOpacity 
                  onPress={() => setActiveFilters({...activeFilters, subject: null})}
                  style={styles.clearFilterButton}
                >
                  <MaterialIcons name="close" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          
          <FlatList
            data={filteredTutors}
            renderItem={renderTutorItem}
            keyExtractor={(item) => item.uid}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#9C27B0']}
                tintColor={'#9C27B0'}
              />
            }
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="search-off" size={64} color="#9E9E9E" />
                <Text style={styles.emptyTitle}>No tutors found</Text>
                <Text style={styles.emptyText}>
                  Try adjusting your filters or search query to find more tutors
                </Text>
                {getActiveFilterCount() > 0 && (
                  <Button 
                    mode="outlined" 
                    icon="filter-remove" 
                    onPress={() => setActiveFilters({
                      subject: null,
                      minRating: 0,
                      maxPrice: 100,
                      minPrice: 0,
                      date: null
                    })}
                    style={styles.clearAllButton}
                    textColor="#9C27B0"
                  >
                    Clear All Filters
                  </Button>
                )}
              </View>
            )}
          />
        </>
      )}
      
      <TutorFilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApplyFilters={handleApplyFilters}
        activeFilters={activeFilters}
        subjects={subjects}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
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
    paddingTop: Platform.OS === 'ios' ? 0 : 20,
  },
  headerContent: {
    padding: 24,
    paddingBottom: 28,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#1F2937',
  },
  filterButton: {
    marginLeft: 12,
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  filterBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#9C27B0',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 4,
  },
  activeFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  activeFilterLabel: {
    fontSize: 14,
    color: '#4B5563',
    marginRight: 8,
  },
  activeFilterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#9C27B0',
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  activeFilterText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginRight: 4,
  },
  clearFilterButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  tutorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 10,
    padding: 10,
    elevation: 2,
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tutorAvatarContainer: {
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#9C27B0',
    overflow: 'hidden',
    marginRight: 16,
    backgroundColor: '#F3E5F5',
    elevation: 2,
    shadowColor: '#9C27B0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  tutorAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  tutorInfo: {
    flex: 1,
  },
  tutorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceText: {
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 4,
    fontWeight: '500',
  },
  subjectsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  subjectTag: {
    backgroundColor: '#F3E5F5',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginRight: 6,
    marginBottom: 4,
  },
  subjectTagText: {
    fontSize: 12,
    color: '#9C27B0',
  },
  moreSubjectsTag: {
    backgroundColor: '#E0E0E0',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginBottom: 4,
  },
  moreSubjectsText: {
    fontSize: 12,
    color: '#616161',
  },
  cardArrow: {
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  emptyContainer: {
    paddingTop: 60,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4B5563',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  clearAllButton: {
    marginTop: 12,
    borderColor: '#9C27B0',
  },
});

export default FindTutorScreen; 