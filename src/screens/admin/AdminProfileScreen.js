import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Button, Card, Avatar, useTheme, List, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCurrentUser, logoutUser } from '../../utils/auth';
import { CommonActions } from '@react-navigation/native';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { MaterialIcons } from '@expo/vector-icons';

const AdminProfileScreen = ({ navigation }) => {
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTutors: 0,
    pendingTutors: 0,
    reportedIssues: 0
  });
  const theme = useTheme();

  const fetchData = useCallback(async () => {
    try {
      const userData = await getCurrentUser();
      if (userData) {
        setUserProfile(userData);
        
        // Fetch real statistics from Firestore
        // Get student count
        const studentQuery = query(
          collection(db, 'users'),
          where('role', '==', 'student')
        );
        const studentSnapshot = await getDocs(studentQuery);
        const studentCount = studentSnapshot.size;

        // Get tutor count
        const tutorQuery = query(
          collection(db, 'users'),
          where('role', '==', 'tutor')
        );
        const tutorSnapshot = await getDocs(tutorQuery);
        const tutorCount = tutorSnapshot.size;

        // Get pending tutor applications
        const pendingQuery = query(
          collection(db, 'tutorApplications'),
          where('status', '==', 'pending')
        );
        const pendingSnapshot = await getDocs(pendingQuery);
        const pendingCount = pendingSnapshot.size;

        // Get reported issues count
        const issuesQuery = query(
          collection(db, 'reportedIssues'),
          where('status', '==', 'pending')
        );
        const issuesSnapshot = await getDocs(issuesQuery);
        const issuesCount = issuesSnapshot.size;

        // Update stats state
        setStats({
          totalStudents: studentCount,
          totalTutors: tutorCount,
          pendingTutors: pendingCount,
          reportedIssues: issuesCount
        });
        
      } else {
        // If no user data, redirect to Auth navigator using CommonActions
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Auth' }],
          })
        );
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigation]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      
      // Use CommonActions.reset instead of getParent
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Auth' }],
        })
      );
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9C27B0" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#9C27B0']}
          />
        }
      >
        <View style={styles.header}>
          <Avatar.Image
            size={100}
            source={userProfile?.photoURL ? { uri: userProfile.photoURL } : require('../../../assets/icon.png')}
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
                <Text style={styles.statNumber}>{stats.totalStudents}</Text>
                <Text style={styles.statLabel}>Students</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.totalTutors}</Text>
                <Text style={styles.statLabel}>Tutors</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.pendingTutors}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.reportedIssues}</Text>
                <Text style={styles.statLabel}>Issues</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.infoCard}>
          <Card.Content>
            <Text style={styles.cardTitle}>Admin Controls</Text>
            <List.Item
              title="Manage Users"
              description={`${stats.totalStudents + stats.totalTutors} users in the platform`}
              left={props => <List.Icon {...props} icon="account-group" color="#2196F3" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => navigation.navigate('Users')}
              style={styles.listItem}
            />
            <List.Item
              title="Tutor Applications"
              description={`${stats.pendingTutors} pending applications`}
              left={props => <List.Icon {...props} icon="account-check" color="#4CAF50" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => navigation.navigate('Applications')}
              style={styles.listItem}
            />
            <List.Item
              title="Reported Issues"
              description={`${stats.reportedIssues} issues to handle`}
              left={props => <List.Icon {...props} icon="alert-circle" color="#FF9800" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => navigation.navigate('Issues')}
              style={styles.listItem}
            />
            <List.Item
              title="Manage Subjects"
              description="Add or remove available subjects"
              left={props => <List.Icon {...props} icon="book-open-variant" color="#9C27B0" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => navigation.navigate('ManageSubjects')}
              style={styles.listItem}
            />
          </Card.Content>
        </Card>

        <View style={styles.buttonContainer}>
          <Button
            mode="outlined"
            style={styles.logoutButton}
            textColor="#F44336"
            icon="logout-variant"
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
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
    color: '#fff',
    backgroundColor: '#9C27B0',
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
    color: '#333',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 10,
    flexWrap: 'wrap',
  },
  statItem: {
    alignItems: 'center',
    minWidth: 70,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#9C27B0',
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
    borderColor: '#F44336',
  },
});

export default AdminProfileScreen; 