import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
import { TextInput, Button, Text, useTheme, Avatar, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { updateUserProfile } from '../../utils/auth';

const EditProfileScreen = ({ navigation }) => {
  const { user, refreshUserData } = useAuth();
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  
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
    }
  }, [user]);
  
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
                Save
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
  },
  header: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  avatarContainer: {
    marginVertical: 10,
    position: 'relative',
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
  cancelButton: {
    borderColor: '#999',
  },
  saveButton: {
    backgroundColor: '#4a90e2',
  },
});

export default EditProfileScreen; 