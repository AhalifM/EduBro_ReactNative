import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, useTheme, Card, Menu, Divider, Chip, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { MaterialIcons, FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Predefined issue categories with proper icon mappings
const ISSUE_CATEGORIES = [
  { id: 'payment', title: 'Payment Problem', icon: 'currency-usd', iconSet: 'MaterialCommunityIcons' },
  { id: 'technical', title: 'Technical Issue', icon: 'laptop', iconSet: 'MaterialCommunityIcons' },
  { id: 'account', title: 'Account Access', icon: 'account', iconSet: 'MaterialCommunityIcons' },
  { id: 'content', title: 'Content Error', icon: 'file-document', iconSet: 'MaterialCommunityIcons' },
  { id: 'app', title: 'App Performance', icon: 'speedometer', iconSet: 'MaterialCommunityIcons' },
  { id: 'other', title: 'Other Issue', icon: 'help-circle', iconSet: 'MaterialCommunityIcons' },
];

const URGENCY_LEVELS = [
  { id: 'low', label: 'Low', color: '#4CAF50' },
  { id: 'medium', label: 'Medium', color: '#FF9800' },
  { id: 'high', label: 'High', color: '#F44336' },
];

const renderIcon = (category, size, color) => {
  if (category.iconSet === 'MaterialCommunityIcons') {
    return <MaterialCommunityIcons name={category.icon} size={size} color={color} />;
  } else if (category.iconSet === 'FontAwesome') {
    return <FontAwesome name={category.icon} size={size} color={color} />;
  } else {
    return <MaterialIcons name={category.icon} size={size} color={color} />;
  }
};

const ReportIssueScreen = ({ navigation }) => {
  const [categoryMenuVisible, setCategoryMenuVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState('medium');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const theme = useTheme();

  const handleSelectCategory = (category) => {
    setSelectedCategory(category);
    setCategoryMenuVisible(false);
  };

  const handleSubmit = async () => {
    if (!selectedCategory || !description.trim()) {
      Alert.alert('Error', 'Please select an issue category and provide a description');
      return;
    }

    try {
      setLoading(true);

      const reportData = {
        title: selectedCategory.title,
        issueType: selectedCategory.id,
        description: description.trim(),
        urgency: urgency,
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
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.sectionTitle}>
          Please provide details about the issue you're experiencing
        </Text>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.inputLabel}>Issue Type</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setCategoryMenuVisible(true)}
            >
              {selectedCategory ? (
                <View style={styles.selectedCategory}>
                  {renderIcon(selectedCategory, 20, theme.colors.primary)}
                  <Text style={styles.selectedCategoryText}>{selectedCategory.title}</Text>
                </View>
              ) : (
                <Text style={styles.dropdownPlaceholder}>Select an issue type</Text>
              )}
              <MaterialCommunityIcons name="chevron-down" size={24} color="#999" />
            </TouchableOpacity>

            <Menu
              visible={categoryMenuVisible}
              onDismiss={() => setCategoryMenuVisible(false)}
              anchor={{ x: 20, y: 170 }}
              style={styles.menu}
            >
              {ISSUE_CATEGORIES.map((category) => (
                <Menu.Item
                  key={category.id}
                  onPress={() => handleSelectCategory(category)}
                  title={category.title}
                  leadingIcon={({ size, color }) => renderIcon(category, size, color)}
                />
              ))}
            </Menu>

            <HelperText type="info" visible={!selectedCategory}>
              Please select the type of issue you're experiencing
            </HelperText>

            <Text style={[styles.inputLabel, {marginTop: 16}]}>Urgency Level</Text>
            <View style={styles.urgencyContainer}>
              {URGENCY_LEVELS.map((level) => (
                <TouchableOpacity
                  key={level.id}
                  onPress={() => setUrgency(level.id)}
                  style={[
                    styles.urgencyButton,
                    urgency === level.id && {borderColor: level.color}
                  ]}
                >
                  <View style={[styles.urgencyDot, {backgroundColor: level.color}]} />
                  <Text style={[
                    styles.urgencyText,
                    urgency === level.id && {color: level.color, fontWeight: '600'}
                  ]}>
                    {level.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.inputLabel, {marginTop: 16}]}>Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              mode="outlined"
              multiline
              numberOfLines={6}
              style={styles.textarea}
              outlineColor="#E0E0E0"
              activeOutlineColor={theme.colors.primary}
              placeholder="Please describe your issue in detail..."
            />
            <HelperText type="info" visible={description.length < 10}>
              Please provide enough detail to help us understand your issue
            </HelperText>

            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={loading}
              disabled={loading || !selectedCategory || !description.trim()}
              style={styles.submitButton}
              contentStyle={styles.submitButtonContent}
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
    backgroundColor: '#F5F7FA',
  },
  
  scrollContainer: {
    padding: 20,
    paddingTop: 12,
  },
  sectionTitle: {
    fontSize: 16,
    color: '#555',
    marginBottom: 16,
    lineHeight: 22,
    marginHorizontal: 5,
    marginVertical: 10,
    textAlign: 'left',
  },
  card: {
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F9F9F9',
  },
  dropdownPlaceholder: {
    color: '#999',
    fontSize: 15,
  },
  selectedCategory: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedCategoryText: {
    marginLeft: 8,
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  menu: {
    borderRadius: 8,
    width: '90%',
    marginTop: 8,
  },
  urgencyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  urgencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
    justifyContent: 'center',
  },
  urgencyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  urgencyText: {
    fontSize: 13,
    color: '#666',
  },
  textarea: {
    marginVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  submitButton: {
    marginTop: 16,
    borderRadius: 12,
    elevation: 2,
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
});

export default ReportIssueScreen; 