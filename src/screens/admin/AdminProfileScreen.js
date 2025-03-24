import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Card, Avatar, useTheme, List } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCurrentUser, logoutUser } from '../../utils/auth';
import { CommonActions } from '@react-navigation/native';

const AdminProfileScreen = ({ navigation }) => {
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();

  // Sample data - in a real app, this would come from Firestore
  const pendingTutors = 5;
  const totalStudents = 124;
  const totalTutors = 32;

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const userData = await getCurrentUser();
      if (userData) {
        setUserProfile(userData);
      } else {
        // If no user data, redirect to Auth navigator
        const rootNavigation = navigation.getParent();
        if (rootNavigation) {
          rootNavigation.navigate('Auth');
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      
      // Get the root navigation
      const rootNavigation = navigation.getParent();
      if (rootNavigation) {
        // Navigate to Auth stack
        rootNavigation.navigate('Auth');
      }
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading profile...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Avatar.Image
            size={100}
            source={require('../../../assets/icon.png')}
            style={styles.avatar}
          />
          <Text style={styles.name}>{userProfile?.fullName || 'Admin'}</Text>
          <Text style={styles.email}>{userProfile?.email || ''}</Text>
          <Text style={styles.role}>Administrator</Text>
        </View>

        <Card style={styles.infoCard}>
          <Card.Content>
            <Text style={styles.cardTitle}>Platform Overview</Text>
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{totalStudents}</Text>
                <Text style={styles.statLabel}>Students</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{totalTutors}</Text>
                <Text style={styles.statLabel}>Tutors</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{pendingTutors}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.infoCard}>
          <Card.Content>
            <Text style={styles.cardTitle}>Admin Controls</Text>
            <List.Item
              title="Manage Users"
              description="View, edit, or remove user accounts"
              left={props => <List.Icon {...props} icon="account-group" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => navigation.navigate('ManageUsers')}
              style={styles.listItem}
            />
            <List.Item
              title="Tutor Applications"
              description={`${pendingTutors} pending applications`}
              left={props => <List.Icon {...props} icon="account-check" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => navigation.navigate('TutorApplications')}
              style={styles.listItem}
            />
            <List.Item
              title="Manage Subjects"
              description="Add or remove available subjects"
              left={props => <List.Icon {...props} icon="book-open-variant" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => navigation.navigate('ManageSubjects')}
              style={styles.listItem}
            />
            <List.Item
              title="Platform Analytics"
              description="View usage statistics and reports"
              left={props => <List.Icon {...props} icon="chart-line" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => navigation.navigate('Analytics')}
              style={styles.listItem}
            />
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
  listItem: {
    paddingVertical: 8,
  },
  buttonContainer: {
    padding: 15,
    marginBottom: 20,
  },
  logoutButton: {
    borderRadius: 8,
  },
});

export default AdminProfileScreen; 