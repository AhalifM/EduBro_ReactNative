import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Chip, Divider, ActivityIndicator, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { db } from '../../firebase/config';
import { doc, getDoc } from 'firebase/firestore';

// Status colors for visual indicators
const STATUS_COLORS = {
  pending: '#FFC107', // Yellow
  in_progress: '#2196F3', // Blue
  resolved: '#4CAF50', // Green
  rejected: '#F44336', // Red
};

const STATUS_LABELS = {
  pending: 'Pending',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  rejected: 'Rejected',
};

const STATUS_DESCRIPTIONS = {
  pending: 'Your issue has been reported and is awaiting review by an administrator.',
  in_progress: 'An administrator is currently reviewing and working on your issue.',
  resolved: 'Your issue has been resolved. Thank you for your report!',
  rejected: 'Your issue has been reviewed but was not deemed actionable at this time.',
};

const IssueDetailScreen = ({ route, navigation }) => {
  const { issueId } = route.params;
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set the navigation title
    navigation.setOptions({
      title: 'Issue Details',
    });
    
    fetchIssueDetails();
  }, [issueId]);

  const fetchIssueDetails = async () => {
    if (!issueId) {
      navigation.goBack();
      return;
    }

    try {
      setLoading(true);
      const issueRef = doc(db, 'reportedIssues', issueId);
      const issueDoc = await getDoc(issueRef);

      if (issueDoc.exists()) {
        const issueData = {
          id: issueDoc.id,
          ...issueDoc.data(),
          createdAt: issueDoc.data().createdAt?.toDate() || new Date(),
          updatedAt: issueDoc.data().updatedAt?.toDate() || new Date(),
        };
        setIssue(issueData);
      } else {
        Alert.alert('Error', 'Issue not found');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error fetching issue details:', error);
      Alert.alert('Error', 'Failed to load issue details');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9C27B0" />
        <Text style={styles.loadingText}>Loading issue details...</Text>
      </View>
    );
  }

  if (!issue) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={64} color="#F44336" />
        <Text style={styles.errorText}>Issue not found</Text>
        <Button mode="contained" onPress={() => navigation.goBack()} style={styles.backButton}>
          Go Back
        </Button>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Issue Title and Status */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.headerRow}>
              <Text style={styles.issueTitle}>{issue.title}</Text>
              <Chip
                style={[styles.statusChip, { backgroundColor: STATUS_COLORS[issue.status] }]}
                textStyle={styles.statusChipText}
              >
                {STATUS_LABELS[issue.status]}
              </Chip>
            </View>
            
            <Text style={styles.statusDescription}>
              {STATUS_DESCRIPTIONS[issue.status]}
            </Text>
          </Card.Content>
        </Card>

        {/* Issue Details */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Issue Details</Text>
            
            <View style={styles.detailRow}>
              <MaterialIcons name="category" size={18} color="#666" />
              <Text style={styles.detailLabel}>Category:</Text>
              <Text style={styles.detailText}>{issue.category}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <MaterialIcons name="access-time" size={18} color="#666" />
              <Text style={styles.detailLabel}>Reported on:</Text>
              <Text style={styles.detailText}>{formatDate(issue.createdAt)}</Text>
            </View>
            
            {issue.updatedAt && issue.updatedAt.getTime() !== issue.createdAt.getTime() && (
              <View style={styles.detailRow}>
                <MaterialIcons name="update" size={18} color="#666" />
                <Text style={styles.detailLabel}>Last updated:</Text>
                <Text style={styles.detailText}>{formatDate(issue.updatedAt)}</Text>
              </View>
            )}
            
            <Divider style={styles.divider} />
            
            <Text style={styles.descriptionTitle}>Description</Text>
            <Text style={styles.description}>{issue.description}</Text>
          </Card.Content>
        </Card>

        {/* Admin Response (if any) */}
        {issue.adminResponse && (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.sectionTitle}>Admin Response</Text>
              <Text style={styles.adminResponseDate}>
                Responded on {formatDate(issue.adminResponseDate?.toDate() || new Date())}
              </Text>
              <Text style={styles.adminResponse}>{issue.adminResponse}</Text>
            </Card.Content>
          </Card>
        )}

        <Button 
          mode="outlined" 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
          icon={({ size, color }) => (
            <MaterialIcons name="arrow-back" size={size} color={color} />
          )}
        >
          Back to Issues
        </Button>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    marginBottom: 24,
  },
  card: {
    borderRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  issueTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  statusChip: {
    paddingHorizontal: 8,
  },
  statusChipText: {
    color: 'white',
    fontWeight: '500',
  },
  statusDescription: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    marginLeft: 6,
    marginRight: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#333',
  },
  divider: {
    marginVertical: 12,
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  adminResponseDate: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  adminResponse: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  backButton: {
    marginTop: 8,
    marginBottom: 24,
  },
});

export default IssueDetailScreen; 