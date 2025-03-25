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
import { getAllTutors, getAllSubjects } from '../../utils/tutorUtils';
import { SafeAreaView } from 'react-native-safe-area-context';

const FindTutorScreen = ({ navigation }) => {
  const [tutors, setTutors] = useState([]);
  const [filteredTutors, setFilteredTutors] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchTutorsAndSubjects();
    
    // Add focus listener to refresh data when screen is focused
    const unsubscribe = navigation.addListener('focus', () => {
      fetchTutorsAndSubjects();
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

  // Handle pull-to-refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchTutorsAndSubjects();
  };

  // Apply filters when search query or selected subject changes
  useEffect(() => {
    filterTutors();
  }, [searchQuery, selectedSubject, tutors]);

  const filterTutors = () => {
    let filtered = [...tutors];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(tutor => {
        const tutorName = (tutor.fullName || tutor.displayName || "").toLowerCase();
        return tutorName.includes(query);
      });
    }

    // Filter by selected subject
    if (selectedSubject) {
      filtered = filtered.filter(tutor => 
        tutor.subjects && tutor.subjects.includes(selectedSubject.id)
      );
    }

    setFilteredTutors(filtered);
  };

  const handleSubjectFilter = (subject) => {
    if (selectedSubject && selectedSubject.id === subject.id) {
      // If the same subject is selected, clear the filter
      setSelectedSubject(null);
    } else {
      setSelectedSubject(subject);
    }
  };

  const handleTutorSelect = (tutor) => {
    navigation.navigate('TutorDetail', { tutor });
  };

  const renderSubjectItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.subjectChip,
        selectedSubject && selectedSubject.id === item.id && styles.selectedSubjectChip
      ]}
      onPress={() => handleSubjectFilter(item)}
    >
      <Text 
        style={[
          styles.subjectChipText, 
          selectedSubject && selectedSubject.id === item.id && styles.selectedSubjectChipText
        ]}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );

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
        </View>
        
        <View style={styles.subjectsFilter}>
          <Text style={styles.filterTitle}>Filter by subject:</Text>
          <FlatList
            data={subjects}
            renderItem={renderSubjectItem}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.subjectsList}
          />
        </View>

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
    backgroundColor: '#fff',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    paddingVertical: 8,
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
  subjectsList: {
    paddingVertical: 4,
  },
  subjectChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
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