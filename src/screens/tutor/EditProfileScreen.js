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
      setHourlyRate(user.hourlyRate ? user.hourlyRate.toString() : '0');
    }
  }, [user]);
  
  // Validate form inputs
  const validateForm = () => {
    let isValid = true;
    const newErrors = { fullName: '', hourlyRate: '', phoneNumber: '' };
    
    if (!fullName.trim()) {
      newErrors.fullName = 'Name is required';
      isValid = false;
    }
    
    if (!hourlyRate) {
      newErrors.hourlyRate = 'Hourly rate is required';
      isValid = false;
    } else if (isNaN(hourlyRate) || parseFloat(hourlyRate) < 0) {
      newErrors.hourlyRate = 'Please enter a valid hourly rate';
      isValid = false;
    }
    
    if (phoneNumber && !/^\+?[0-9]{10,15}$/.test(phoneNumber.replace(/[\s-]/g, ''))) {
      newErrors.phoneNumber = 'Please enter a valid phone number';
      isValid = false;
    }
    
    setErrors(newErrors);
    return isValid;
  };
  
  const handleSave = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      // Convert hourly rate to number
      const rateAsNumber = parseFloat(hourlyRate);
      
      // Update user profile in Firestore
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
            <Avatar.Image
              size={100}
              source={user?.photoURL ? { uri: user.photoURL } : require('../../../assets/icon.png')}
              style={styles.avatar}
            />
            <Text style={styles.avatarText}>Profile Picture</Text>
            {/* Photo upload feature could be added here */}
          </View>
          
          <View style={styles.formContainer}>
            <TextInput
              label="Full Name"
              value={fullName}
              onChangeText={setFullName}
              style={styles.input}
              mode="outlined"
              error={!!errors.fullName}
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
            />
            
            <TextInput
              label="Phone Number"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              style={styles.input}
              mode="outlined"
              keyboardType="phone-pad"
              error={!!errors.phoneNumber}
            />
            <HelperText type="error" visible={!!errors.phoneNumber}>
              {errors.phoneNumber}
            </HelperText>
            
            <TextInput
              label="Hourly Rate (USD)"
              value={hourlyRate}
              onChangeText={setHourlyRate}
              style={styles.input}
              mode="outlined"
              keyboardType="numeric"
              error={!!errors.hourlyRate}
              left={<TextInput.Affix text="$" />}
            />
            <HelperText type="error" visible={!!errors.hourlyRate}>
              {errors.hourlyRate}
            </HelperText>
            
            <View style={styles.buttonContainer}>
              <Button
                mode="outlined"
                onPress={() => navigation.goBack()}
                style={[styles.button, styles.cancelButton]}
                disabled={loading}
              >
                Cancel
              </Button>
              
              <Button
                mode="contained"
                onPress={handleSave}
                style={[styles.button, styles.saveButton]}
                loading={loading}
                disabled={loading}
              >
                Save Changes
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
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    padding: 20,
  },
  avatar: {
    marginBottom: 10,
  },
  avatarText: {
    fontSize: 14,
    color: '#666',
  },
  formContainer: {
    padding: 16,
  },
  input: {
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flex: 1,
    marginHorizontal: 5,
  },
  cancelButton: {
    borderColor: '#999',
  },
  saveButton: {
    backgroundColor: '#4285F4',
  },
});

export default EditProfileScreen; 