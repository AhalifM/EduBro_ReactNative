import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useTheme, Chip, Searchbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { getAllSubjects, addSubjectToTutor, removeSubjectFromTutor } from '../../utils/tutorUtils';

const EditSubjectsScreen = ({ navigation }) => {
  const { user, refreshUserData } = useAuth();
  const theme = useTheme();
  const [allSubjects, setAllSubjects] = useState([]);
  const [mySubjects, setMySubjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredSubjects, setFilteredSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchSubjects();
  }, []);

  useEffect(() => {
    // Filter subjects based on search query
    if (searchQuery) {
      const filtered = allSubjects.filter(subject => 
        subject.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredSubjects(filtered);
    } else {
      setFilteredSubjects(allSubjects);
    }
  }, [searchQuery, allSubjects]);

  const fetchSubjects = async () => {
    setIsLoading(true);
    try {
      // Get all available subjects
      const result = await getAllSubjects();
      if (result.success) {
        setAllSubjects(result.subjects);
        setFilteredSubjects(result.subjects);
      }

      // Get tutor's subjects
      if (user && user.subjects) {
        const mySubjectIds = user.subjects || [];
        const mySubjectObjects = result.subjects.filter(s => mySubjectIds.includes(s.id));
        setMySubjects(mySubjectObjects);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
      Alert.alert('Error', 'Failed to load subjects');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSubject = async (subject) => {
    if (mySubjects.find(s => s.id === subject.id)) {
      // Subject already added
      return;
    }

    setIsLoading(true);
    try {
      console.log('Adding subject to tutor profile:', subject);
      console.log('Current user:', user);
      
      const result = await addSubjectToTutor(user.uid, subject.id);
      console.log('Add subject result:', result);
      
      if (result.success) {
        // Update local state
        setMySubjects([...mySubjects, subject]);
        
        // Refresh user data in AuthContext
        const refreshResult = await refreshUserData();
        console.log('Refresh user data result:', refreshResult);
        
        // Fetch directly from Firestore to confirm update
        const { doc, getDoc } = require('firebase/firestore');
        const { db } = require('../../firebase/config');
        
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        console.log('Updated user data from Firestore:', userDoc.exists() ? userDoc.data() : 'No user doc');
        
        Alert.alert('Success', `Added ${subject.name} to your subjects`);
      }
    } catch (error) {
      console.error('Error adding subject:', error);
      Alert.alert('Error', 'Failed to add subject');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveSubject = async (subject) => {
    setIsLoading(true);
    try {
      const result = await removeSubjectFromTutor(user.uid, subject.id);
      if (result.success) {
        // Update local state
        const updatedSubjects = mySubjects.filter(s => s.id !== subject.id);
        setMySubjects(updatedSubjects);
        
        // Refresh user data in AuthContext
        await refreshUserData();
        
        Alert.alert('Success', `Removed ${subject.name} from your subjects`);
      }
    } catch (error) {
      console.error('Error removing subject:', error);
      Alert.alert('Error', 'Failed to remove subject');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && mySubjects.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading subjects...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Edit Your Subjects</Text>
        <Text style={styles.subtitle}>
          Add or remove subjects that you can teach
        </Text>
      </View>

      {mySubjects.length > 0 && (
        <View style={styles.mySubjectsSection}>
          <Text style={styles.sectionTitle}>My Subjects</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.mySubjectsContainer}
          >
            {mySubjects.map((subject) => (
              <Chip
                key={subject.id}
                style={styles.mySubjectChip}
                textStyle={styles.mySubjectChipText}
                onClose={() => handleRemoveSubject(subject)}
                icon="check"
              >
                {subject.name}
              </Chip>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.allSubjectsSection}>
        <Text style={styles.sectionTitle}>Available Subjects</Text>
        
        <Searchbar
          placeholder="Search subjects"
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          iconColor={theme.colors.primary}
        />
        
        <ScrollView style={styles.subjectsList}>
          {filteredSubjects.map((subject) => {
            const isAdded = mySubjects.some(s => s.id === subject.id);
            
            return (
              <TouchableOpacity
                key={subject.id}
                style={[
                  styles.subjectItem,
                  isAdded && styles.subjectItemSelected
                ]}
                onPress={() => {
                  if (isAdded) {
                    handleRemoveSubject(subject);
                  } else {
                    handleAddSubject(subject);
                  }
                }}
                disabled={isLoading}
              >
                <Text style={[
                  styles.subjectName,
                  isAdded && styles.subjectNameSelected
                ]}>
                  {subject.name}
                </Text>
                
                <View style={styles.subjectAction}>
                  {isAdded ? (
                    <MaterialIcons name="check-circle" size={24} color={theme.colors.primary} />
                  ) : (
                    <MaterialIcons name="add-circle-outline" size={24} color="#999" />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  mySubjectsSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  mySubjectsContainer: {
    paddingVertical: 8,
  },
  mySubjectChip: {
    margin: 4,
    backgroundColor: '#e0f7fa',
  },
  mySubjectChipText: {
    color: '#00838f',
  },
  allSubjectsSection: {
    flex: 1,
    padding: 16,
  },
  searchBar: {
    marginBottom: 16,
    elevation: 2,
  },
  subjectsList: {
    flex: 1,
  },
  subjectItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  subjectItemSelected: {
    backgroundColor: '#f0f7ff',
  },
  subjectName: {
    fontSize: 16,
    color: '#333',
  },
  subjectNameSelected: {
    fontWeight: 'bold',
    color: '#0066cc',
  },
  subjectAction: {
    width: 30,
    alignItems: 'center',
  },
});

export default EditSubjectsScreen; 