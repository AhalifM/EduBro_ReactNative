import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, useTheme, Avatar, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { updateUserProfile } from '../../utils/auth';
import { updateTutorHourlyRate } from '../../utils/tutorUtils';

const EditProfileScreen = ({ navigation }) => {
  const { user, refreshUserData } = useAuth();
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  
  // Validation state
  const [errors, setErrors] = useState({
    fullName: '',
    hourlyRate: '',
    phoneNumber: ''
  });
  
  // Load user data when component mounts
  useEffect(() => {
    if (user) {
      setFullName(user.fullName || user.displayName || '');
      setBio(user.bio || '');
      setPhoneNumber(user.phoneNumber || '');
      setHourlyRate(user.hourlyRate ? user.hourlyRate.toString() : '');
    }
  }, [user]);
  
  const validateForm = () => {
    let isValid = true;
    const newErrors = {
      fullName: '',
      hourlyRate: '',
      phoneNumber: ''
    };
    
    // Validate full name
    if (!fullName.trim()) {
      newErrors.fullName = 'Full name is required';
      isValid = false;
    }
    
    // Validate hourly rate
    if (!hourlyRate) {
      newErrors.hourlyRate = 'Hourly rate is required';
      isValid = false;
    } else {
      const rateAsNumber = parseFloat(hourlyRate);
      if (isNaN(rateAsNumber) || rateAsNumber <= 0) {
        newErrors.hourlyRate = 'Please enter a valid hourly rate';
        isValid = false;
      }
    }
    
    // Validate phone number
    if (!phoneNumber) {
      newErrors.phoneNumber = 'Phone number is required';
      isValid = false;
    } else if (!/^\+?[0-9\s-]{10,15}$/.test(phoneNumber.trim())) {
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
      
      // Parse hourly rate
      const rateAsNumber = parseFloat(hourlyRate);
      
      // Update user profile in Firestore (without photo URL)
      const result = await updateUserProfile(user.uid, {
        fullName,
        bio,
        phoneNumber,
        updatedAt: new Date().toISOString(),
      });
      
      // Update hourly rate (separate function for tutors)
      const rateResult = await updateTutorHourlyRate(user.uid, rateAsNumber);
      
      if (result.success && rateResult.success) {
        // Refresh user data in context
        await refreshUserData();
        
        Alert.alert('Success', 'Profile updated successfully');
        navigation.goBack();
      } else {
        Alert.alert('Error', result.error || rateResult.error || 'Failed to update profile');
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
              label="Bio"
              value={bio}
              onChangeText={setBio}
              style={styles.input}
              mode="outlined"
              multiline
              numberOfLines={4}
              placeholder="Tell students about yourself, your teaching experience and qualifications..."
              disabled={loading}
            />
            
            <TextInput
              label="Phone Number"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              style={styles.input}
              mode="outlined"
              keyboardType="phone-pad"
              error={!!errors.phoneNumber}
              disabled={loading}
            />
            <HelperText type="error" visible={!!errors.phoneNumber}>
              {errors.phoneNumber}
            </HelperText>
            
            <TextInput
              label="Hourly Rate ($)"
              value={hourlyRate}
              onChangeText={setHourlyRate}
              style={styles.input}
              mode="outlined"
              keyboardType="numeric"
              error={!!errors.hourlyRate}
              disabled={loading}
            />
            <HelperText type="error" visible={!!errors.hourlyRate}>
              {errors.hourlyRate}
            </HelperText>
            
            <View style={styles.buttonContainer}>
              <Button
                mode="contained"
                onPress={handleSave}
                style={styles.saveButton}
                buttonColor="#9C27B0"
                loading={loading}
                disabled={loading}
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
    marginTop: 8,
    fontSize: 14,
    color: '#9E9E9E',
    fontStyle: 'italic',
  },
  formContainer: {
    marginTop: 20,
  },
  input: {
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  saveButton: {
    marginBottom: 16,
  },
  cancelButton: {
    borderColor: '#9C27B0',
  },
});

export default EditProfileScreen; 