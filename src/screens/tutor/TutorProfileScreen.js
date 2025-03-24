import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, Card, Avatar, useTheme, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { getAllSubjects } from '../../utils/tutorUtils';
import { logoutUser } from '../../utils/auth';
import { CommonActions, useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

const TutorProfileScreen = ({ navigation }) => {
  const { user, signOut, refreshUserData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState([]);
  const theme = useTheme();

  // Sample values for stats - in a real app, these would come from Firestore
  const rating = user?.rating || 'New';
  const sessionsCompleted = 0; // This would be fetched from Firebase
  const studentsHelped = 0; // This would be fetched from Firebase

  // Fetch subjects whenever the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user) {
        // Refresh user data from Firestore
        refreshUserData().then(() => {
          fetchSubjects();
        });
      }
    }, [user, refreshUserData])
  );

  // Initial fetch of subjects on component mount
  useEffect(() => {
    if (user) {
      fetchSubjects();
    }
  }, [user]);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const result = await getAllSubjects();
      
      if (result.success) {
        // Debug log all subjects
        console.log('All available subjects:', result.subjects);
        
        // Get the latest user data directly instead of through refreshUserData 
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          console.log('User data from Firestore:', userData);
          
          // Extract subjects array
          const mySubjectIds = userData.subjects || [];
          console.log('My subject IDs array:', mySubjectIds);
          
          // Filter subjects to only show ones the tutor teaches
          const mySubjects = result.subjects.filter(subject => 
            mySubjectIds.includes(subject.id)
          );
          
          console.log('Filtered subjects for display:', mySubjects);
          setSubjects(mySubjects);
        } else {
          console.log('User document not found in Firestore');
          setSubjects([]);
        }
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
      Alert.alert('Error', 'Failed to load subjects');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      
      // Reset navigation to Auth
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Auth' }],
        })
      );
    } catch (error) {
      console.error('Error logging out:', error);
      Alert.alert('Error', 'Failed to log out');
    }
  };

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Not logged in</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Avatar.Image
            size={100}
            source={user.photoURL ? { uri: user.photoURL } : require('../../../assets/icon.png')}
            style={styles.avatar}
          />
          <Text style={styles.name}>{user.fullName || user.displayName || 'Tutor'}</Text>
          <Text style={styles.email}>{user.email || ''}</Text>
          <Text style={styles.role}>Tutor</Text>
          
          <View style={styles.ratingContainer}>
            <Text style={styles.rating}>{rating} ★</Text>
            <Text style={styles.ratingText}>Tutor Rating</Text>
          </View>
          
          <Button 
            mode="outlined" 
            style={styles.editProfileButton}
            onPress={() => navigation.navigate('EditProfile')}
          >
            Edit Profile
          </Button>
        </View>

        <Card style={styles.infoCard}>
          <Card.Content>
            <Text style={styles.cardTitle}>Your Teaching Stats</Text>
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{sessionsCompleted}</Text>
                <Text style={styles.statLabel}>Sessions</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{studentsHelped}</Text>
                <Text style={styles.statLabel}>Students</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{subjects.length}</Text>
                <Text style={styles.statLabel}>Subjects</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.infoCard}>
          <Card.Content>
            <Text style={styles.cardTitle}>Your Teaching Subjects</Text>
            {subjects.length > 0 ? (
              <View style={styles.subjectsContainer}>
                {subjects.map((subject) => (
                  <Chip 
                    key={subject.id} 
                    style={styles.subjectChip}
                    textStyle={{ color: theme.colors.primary }}
                  >
                    {subject.name}
                  </Chip>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>
                You haven't added any subjects yet. Add subjects to be visible to students.
              </Text>
            )}
            <Button 
              mode="outlined" 
              style={styles.editButton}
              onPress={() => navigation.navigate('EditSubjects')}
            >
              {subjects.length > 0 ? 'Edit Subjects' : 'Add Subjects'}
            </Button>
          </Card.Content>
        </Card>

        <Card style={styles.infoCard}>
          <Card.Content>
            <Text style={styles.cardTitle}>Upcoming Sessions</Text>
            <Text style={styles.emptyText}>No upcoming sessions</Text>
            <Button 
              mode="contained" 
              style={[styles.scheduleButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => navigation.navigate('ManageSessions')}
            >
              Manage Your Schedule
            </Button>
          </Card.Content>
        </Card>

        <View style={styles.buttonContainer}>
          <Button
            mode="outlined"
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            Logout
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  avatar: {
    marginBottom: 10,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  role: {
    fontSize: 14,
    color: '#888',
    backgroundColor: '#f0f0f0',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 10,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  rating: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
    marginRight: 5,
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
  },
  infoCard: {
    margin: 15,
    borderRadius: 10,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 10,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  subjectsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  subjectChip: {
    margin: 4,
    backgroundColor: '#f0f0f0',
  },
  editButton: {
    borderRadius: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#888',
    fontStyle: 'italic',
    marginVertical: 15,
  },
  scheduleButton: {
    marginTop: 10,
    borderRadius: 8,
  },
  buttonContainer: {
    padding: 15,
    marginBottom: 20,
  },
  logoutButton: {
    borderRadius: 8,
  },
  editProfileButton: {
    borderRadius: 8,
    marginTop: 10,
  },
});

export default TutorProfileScreen; 