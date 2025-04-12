import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { TextInput, Button, Text, RadioButton, useTheme, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { registerUser } from '../../utils/auth';
import { getAllSubjects } from '../../utils/tutorUtils';
import { MaterialIcons } from '@expo/vector-icons';

const RegisterScreen = ({ navigation }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  
  // Additional fields for tutors
  const [showTutorFields, setShowTutorFields] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [experience, setExperience] = useState('');
  const [education, setEducation] = useState('');
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [adminModeEnabled, setAdminModeEnabled] = useState(false);
  const [adminTapCount, setAdminTapCount] = useState(0);

  const theme = useTheme();

  // Show tutor fields when role is tutor
  useEffect(() => {
    setShowTutorFields(role === 'tutor');
  }, [role]);
  
  // Fetch available subjects when tutor role is selected
  useEffect(() => {
    if (role === 'tutor') {
      fetchSubjects();
    }
  }, [role]);
  
  const fetchSubjects = async () => {
    try {
      setLoadingSubjects(true);
      const result = await getAllSubjects();
      if (result.success) {
        setAvailableSubjects(result.subjects);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
    } finally {
      setLoadingSubjects(false);
    }
  };

  const validateForm = () => {
    if (!fullName || !email || !password || !confirmPassword) {
      setError('All fields are required');
      return false;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    
    if (role === 'tutor') {
      if (!phoneNumber) {
        setError('Phone number is required for tutors');
        return false;
      }
      
      if (!hourlyRate || isNaN(parseFloat(hourlyRate))) {
        setError('Please enter a valid hourly rate');
        return false;
      }
      
      if (selectedSubjects.length === 0) {
        setError('Please select at least one subject');
        return false;
      }
    }
    
    return true;
  };
  
  const toggleSubject = (subject) => {
    if (selectedSubjects.includes(subject)) {
      setSelectedSubjects(selectedSubjects.filter(s => s !== subject));
    } else {
      setSelectedSubjects([...selectedSubjects, subject]);
    }
  };

  const handleAdminTap = () => {
    // Increment tap count
    const newCount = adminTapCount + 1;
    setAdminTapCount(newCount);
    
    // Enable admin mode after 5 taps
    if (newCount >= 5 && !adminModeEnabled) {
      setAdminModeEnabled(true);
      Alert.alert('Developer Mode', 'Admin role selection is now enabled.');
      setAdminTapCount(0);
    }
    
    // Reset counter after 3 seconds of inactivity
    setTimeout(() => {
      setAdminTapCount(0);
    }, 3000);
  };

  const handleRegister = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    setError('');
    
    try {
      let additionalData = {};
      
      if (role === 'tutor') {
        additionalData = {
          phoneNumber,
          hourlyRate: parseFloat(hourlyRate),
          subjects: selectedSubjects,
          experience,
          education
        };
      }
      
      const result = await registerUser(email, password, fullName, role, additionalData);
      
      if (result.success) {
        navigation.navigate('Login', { message: 'Registration successful! Please log in.' });
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Registration failed. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Create an Account</Text>
        
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        
        <TextInput
          label="Full Name"
          value={fullName}
          onChangeText={setFullName}
          style={styles.input}
          mode="outlined"
        />
        
        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          mode="outlined"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        
        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          mode="outlined"
          secureTextEntry={!passwordVisible}
          right={
            <TextInput.Icon
              icon={passwordVisible ? 'eye-off' : 'eye'}
              onPress={() => setPasswordVisible(!passwordVisible)}
            />
          }
        />
        
        <TextInput
          label="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          style={styles.input}
          mode="outlined"
          secureTextEntry={!confirmPasswordVisible}
          right={
            <TextInput.Icon
              icon={confirmPasswordVisible ? 'eye-off' : 'eye'}
              onPress={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
            />
          }
        />
        
        <Text style={styles.sectionTitle}>Select Your Role</Text>
        <View style={styles.roleContainer}>
          <TouchableOpacity
            style={[
              styles.roleOption,
              role === 'student' && styles.roleOptionSelected
            ]}
            onPress={() => setRole('student')}
          >
            <MaterialIcons
              name="school"
              size={24}
              color={role === 'student' ? '#FFFFFF' : '#9C27B0'}
            />
            <Text
              style={[
                styles.roleText,
                role === 'student' && styles.roleTextSelected
              ]}
            >
              Student
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.roleOption,
              role === 'tutor' && styles.roleOptionSelected
            ]}
            onPress={() => setRole('tutor')}
          >
            <MaterialIcons
              name="assignment"
              size={24}
              color={role === 'tutor' ? '#FFFFFF' : '#9C27B0'}
            />
            <Text
              style={[
                styles.roleText,
                role === 'tutor' && styles.roleTextSelected
              ]}
            >
              Tutor
            </Text>
          </TouchableOpacity>
          
          {adminModeEnabled && (
            <TouchableOpacity
              style={[
                styles.roleOption,
                role === 'admin' && styles.roleOptionSelected
              ]}
              onPress={() => setRole('admin')}
            >
              <MaterialIcons
                name="admin-panel-settings"
                size={24}
                color={role === 'admin' ? '#FFFFFF' : '#9C27B0'}
              />
              <Text
                style={[
                  styles.roleText,
                  role === 'admin' && styles.roleTextSelected
                ]}
              >
                Admin
              </Text>
            </TouchableOpacity>
          )}
        </View>
        
        {showTutorFields && (
          <View style={styles.tutorFieldsContainer}>
            <Text style={styles.sectionTitle}>Tutor Information</Text>
            
            <TextInput
              label="Phone Number"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              style={styles.input}
              mode="outlined"
              keyboardType="phone-pad"
              placeholder="e.g., +1 123 456 7890"
            />
            
            <TextInput
              label="Hourly Rate ($)"
              value={hourlyRate}
              onChangeText={setHourlyRate}
              style={styles.input}
              mode="outlined"
              keyboardType="numeric"
              placeholder="e.g., 25"
            />
            
            <TextInput
              label="Education (Optional)"
              value={education}
              onChangeText={setEducation}
              style={styles.input}
              mode="outlined"
              placeholder="e.g., Bachelor's in Economics"
            />
            
            <TextInput
              label="Experience (Optional)"
              value={experience}
              onChangeText={setExperience}
              style={styles.input}
              mode="outlined"
              multiline
              numberOfLines={3}
              placeholder="Briefly describe your tutoring experience"
            />
            
            <Text style={styles.subjectsTitle}>Subjects You Can Teach:</Text>
            
            {loadingSubjects ? (
              <Text style={styles.loadingText}>Loading subjects...</Text>
            ) : (
              <View style={styles.subjectsContainer}>
                {availableSubjects.map((subject) => (
                  <Chip
                    key={subject.id}
                    selected={selectedSubjects.includes(subject.id)}
                    onPress={() => toggleSubject(subject.id)}
                    style={styles.subjectChip}
                    selectedColor={theme.colors.primary}
                  >
                    {subject.name}
                  </Chip>
                ))}
              </View>
            )}
          </View>
        )}
        
        <Text 
          style={styles.appVersion}
          onPress={handleAdminTap}
        >
          v1.0.0
        </Text>
        
        <Button
          mode="contained"
          onPress={handleRegister}
          style={styles.button}
          loading={loading}
          disabled={loading}
        >
          Register
        </Button>
        
        <View style={styles.loginContainer}>
          <Text>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  roleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    width: '30%',
  },
  roleOptionSelected: {
    backgroundColor: '#9C27B0',
    borderColor: '#9C27B0',
  },
  roleText: {
    marginLeft: 8,
    fontSize: 16,
  },
  roleTextSelected: {
    color: '#FFFFFF',
  },
  button: {
    marginVertical: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 16,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 16,
  },
  tutorFieldsContainer: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 16,
  },
  subjectsTitle: {
    fontSize: 16,
    marginTop: 10,
    marginBottom: 10,
    color: '#333',
  },
  subjectsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  subjectChip: {
    margin: 4,
  },
  loadingText: {
    marginVertical: 10,
    color: '#666',
    fontStyle: 'italic',
  },
  appVersion: {
    textAlign: 'center',
    marginTop: 20,
    color: '#999',
    fontSize: 12,
  },
});

export default RegisterScreen; 