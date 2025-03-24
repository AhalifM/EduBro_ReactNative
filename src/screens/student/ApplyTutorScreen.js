import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { TextInput, Button, Text, Chip, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { applyForTutor } from '../../utils/auth';
import { getAllSubjects } from '../../utils/tutorUtils';
import { useAuth } from '../../contexts/AuthContext';

const ApplyTutorScreen = ({ navigation }) => {
  const { user } = useAuth();
  const theme = useTheme();
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [experience, setExperience] = useState('');
  const [education, setEducation] = useState('');
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    setLoadingSubjects(true);
    try {
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

  const toggleSubject = (subject) => {
    if (selectedSubjects.includes(subject.id)) {
      setSelectedSubjects(selectedSubjects.filter(id => id !== subject.id));
    } else {
      setSelectedSubjects([...selectedSubjects, subject.id]);
    }
  };

  const validateForm = () => {
    if (!phoneNumber.trim()) {
      setError('Please enter your phone number');
      return false;
    }
    
    if (!hourlyRate) {
      setError('Please enter your hourly rate');
      return false;
    }
    
    if (isNaN(parseFloat(hourlyRate)) || parseFloat(hourlyRate) <= 0) {
      setError('Please enter a valid hourly rate');
      return false;
    }
    
    if (selectedSubjects.length === 0) {
      setError('Please select at least one subject you can teach');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    setError('');
    
    try {
      const result = await applyForTutor(user.uid, {
        phoneNumber,
        hourlyRate: parseFloat(hourlyRate),
        subjects: selectedSubjects,
        experience,
        education
      });
      
      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error || 'Application failed. Please try again.');
      }
    } catch (err) {
      console.error('Error applying for tutor:', err);
      setError('Application failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <Text style={styles.successTitle}>Application Submitted</Text>
          <Text style={styles.successMessage}>
            Thank you for applying to become a tutor. Your application has been submitted and is under review.
            You will be notified when your application is approved.
          </Text>
          <Button
            mode="contained"
            style={styles.button}
            onPress={() => navigation.goBack()}
          >
            Return to Profile
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Apply to be a Tutor</Text>
        <Text style={styles.subtitle}>
          Share your knowledge with others and earn while helping fellow students succeed!
        </Text>
        
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        
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
                onPress={() => toggleSubject(subject)}
                style={styles.subjectChip}
                selectedColor={theme.colors.primary}
              >
                {subject.name}
              </Chip>
            ))}
          </View>
        )}
        
        <Button
          mode="contained"
          onPress={handleSubmit}
          style={styles.button}
          loading={loading}
          disabled={loading}
        >
          Submit Application
        </Button>
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
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
  },
  subjectsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 8,
  },
  subjectsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  subjectChip: {
    margin: 4,
  },
  button: {
    marginVertical: 16,
    paddingVertical: 6,
  },
  errorText: {
    color: 'red',
    marginBottom: 16,
    textAlign: 'center',
  },
  loadingText: {
    textAlign: 'center',
    marginVertical: 10,
    color: '#666',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#4CAF50',
  },
  successMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
});

export default ApplyTutorScreen; 