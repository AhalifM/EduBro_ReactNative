import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
import { TextInput, Button, Text, useTheme, Avatar, HelperText, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { updateUserProfile } from '../../utils/auth';
import { getAllSubjects } from '../../utils/tutorUtils';

const EditProfileScreen = ({ navigation }) => {
  const { user, refreshUserData } = useAuth();
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  
  // Validation state
  const [errors, setErrors] = useState({
    fullName: '',
    phoneNumber: ''
  });
  
  // Load user data when component mounts
  useEffect(() => {
    if (user) {
      setFullName(user.fullName || user.displayName || '');
      setPhoneNumber(user.phoneNumber || '');
      setSelectedSubjects(user.interestedSubjects || []);
    }
    
    fetchSubjects();
  }, [user]);
  
  const fetchSubjects = async () => {
    setLoadingSubjects(true);
    try {
      const result = await getAllSubjects();
      if (result.success) {
        setSubjects(result.subjects);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
    } finally {
      setLoadingSubjects(false);
    }
  };

  const handleSubjectToggle = (subjectId) => {
    setSelectedSubjects(prev => {
      if (prev.includes(subjectId)) {
        return prev.filter(id => id !== subjectId);
      } else {
        return [...prev, subjectId];
      }
    });
  };
  
  const validateForm = () => {
    let isValid = true;
    const newErrors = {
      fullName: '',
      phoneNumber: ''
    };
    
    // Validate full name
    if (!fullName.trim()) {
      newErrors.fullName = 'Full name is required';
      isValid = false;
    }
    
    // Validate phone number (optional)
    if (phoneNumber && !/^\+?[0-9\s-]{10,15}$/.test(phoneNumber.trim())) {
      newErrors.phoneNumber = 'Please enter a valid phone number';
      isValid = false;
    }
    
    setErrors(newErrors);
    return isValid;
  };
  
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Update user profile in Firestore (without photo URL)
      const result = await updateUserProfile(user.uid, {
        fullName,
        phoneNumber,
        interestedSubjects: selectedSubjects,
        updatedAt: new Date().toISOString(),
      });
      
      if (result.success) {
        // Refresh user data in context
        await refreshUserData();
        
        Alert.alert('Success', 'Profile updated successfully');
        navigation.goBack();
      } else {
        Alert.alert('Error', result.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <View style={styles.avatarContainer}>
              <Avatar.Image
                size={120}
                source={user?.photoURL ? { uri: user.photoURL } : require('../../../assets/icon.png')}
              />
            </View>
            
            <Text style={styles.note}>
              Profile picture uploads are temporarily disabled
            </Text>
          </View>
          
          <View style={styles.formContainer}>
            <TextInput
              label="Full Name"
              value={fullName}
              onChangeText={setFullName}
              style={styles.input}
              mode="outlined"
              error={!!errors.fullName}
              disabled={loading}
            />
            <HelperText type="error" visible={!!errors.fullName}>
              {errors.fullName}
            </HelperText>
            
            <TextInput
              label="Phone Number"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              style={styles.input}
              mode="outlined"
              keyboardType="phone-pad"
              error={!!errors.phoneNumber}
              disabled={loading}
              placeholder="Optional"
            />
            <HelperText type="error" visible={!!errors.phoneNumber}>
              {errors.phoneNumber}
            </HelperText>
            
            <View style={styles.subjectsSection}>
              <Text style={styles.sectionTitle}>Subjects I'm Interested In</Text>
              {loadingSubjects ? (
                <ActivityIndicator size="small" color="#9C27B0" />
              ) : (
                <View style={styles.chipsContainer}>
                  {subjects.map(subject => (
                    <Chip
                      key={subject.id}
                      selected={selectedSubjects.includes(subject.id)}
                      style={[
                        styles.chip,
                        selectedSubjects.includes(subject.id) && styles.selectedChip
                      ]}
                      textStyle={[
                        styles.chipText,
                        selectedSubjects.includes(subject.id) && styles.selectedChipText
                      ]}
                      onPress={() => handleSubjectToggle(subject.id)}
                      mode="outlined"
                    >
                      {subject.name}
                    </Chip>
                  ))}
                </View>
              )}
              <Text style={styles.helperText}>
                Select subjects you want to learn. This helps us show tutors relevant to your interests.
              </Text>
            </View>

            <View style={styles.buttonContainer}>
              <Button
                mode="contained"
                onPress={handleSave}
                style={styles.saveButton}
                buttonColor="#9C27B0"
                disabled={loading}
                loading={loading}
              >
                Save Changes
              </Button>
              <Button
                mode="outlined"
                onPress={() => navigation.goBack()}
                style={styles.cancelButton}
                textColor="#9C27B0"
                disabled={loading}
              >
                Cancel
              </Button>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContainer: {
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginVertical: 20,
  },
  avatarContainer: {
    marginBottom: 16,
    borderRadius: 60,
    padding: 4,
    backgroundColor: 'white',
    shadowColor: "#9C27B0",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  note: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic',
  },
  formContainer: {
    padding: 20,
  },
  input: {
    marginBottom: 5,
    backgroundColor: '#fff',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    width: '48%',
  },
  saveButton: {
    marginBottom: 16,
  },
  cancelButton: {
    borderColor: '#9C27B0',
  },
  subjectsSection: {
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  chip: {
    margin: 4,
    backgroundColor: '#f0f7ff',
    borderColor: '#2196F3',
  },
  selectedChip: {
    backgroundColor: '#F3E5F5',
    borderColor: '#9C27B0',
  },
  chipText: {
    color: '#2196F3',
  },
  selectedChipText: {
    color: '#9C27B0',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
});

export default EditProfileScreen; 