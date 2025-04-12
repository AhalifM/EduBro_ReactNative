import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, useTheme, Card } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const ReportIssueScreen = ({ navigation }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const theme = useTheme();

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    try {
      setLoading(true);

      const reportData = {
        title: title.trim(),
        description: description.trim(),
        userId: user.uid,
        userEmail: user.email,
        userName: user.fullName || user.displayName,
        userRole: user.role,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Add the report to Firestore
      await addDoc(collection(db, 'reportedIssues'), reportData);

      Alert.alert(
        'Success',
        'Your issue has been reported. An admin will look into it soon.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error reporting issue:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.headerText}>Report an Issue</Text>
            <Text style={styles.subHeaderText}>
              Please provide details about the issue you're experiencing
            </Text>

            <TextInput
              label="Issue Title"
              value={title}
              onChangeText={setTitle}
              mode="outlined"
              style={styles.input}
              outlineColor={theme.colors.primary}
              activeOutlineColor={theme.colors.primary}
              placeholder="Brief title describing the issue"
            />

            <TextInput
              label="Description"
              value={description}
              onChangeText={setDescription}
              mode="outlined"
              multiline
              numberOfLines={6}
              style={styles.textarea}
              outlineColor={theme.colors.primary}
              activeOutlineColor={theme.colors.primary}
              placeholder="Please describe the issue in detail"
            />

            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={loading}
              disabled={loading}
              style={styles.submitButton}
              buttonColor={theme.colors.primary}
            >
              Submit Report
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    padding: 16,
  },
  card: {
    borderRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  subHeaderText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  textarea: {
    marginBottom: 24,
    backgroundColor: '#fff',
  },
  submitButton: {
    marginTop: 8,
    paddingVertical: 8,
  },
});

export default ReportIssueScreen; 