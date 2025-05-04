import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, FlatList, TouchableOpacity, Dimensions } from 'react-native';
import { Text, Card, Avatar, Button, Searchbar, Chip, FAB, Divider, ActivityIndicator, Menu, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, orderBy, limit } from 'firebase/firestore';
import { PieChart, LineChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

const ManageUsersScreen = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    students: 0,
    tutors: 0,
    admins: 0,
    pendingTutors: 0,
    activeUsers: 0,
    newUsersThisWeek: 0,
    newUsersLastWeek: 0
  });
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [chartLoading, setChartLoading] = useState(true);
  const [userActivityData, setUserActivityData] = useState({
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{ data: [0, 0, 0, 0, 0, 0, 0] }]
  });
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showingSearch, setShowingSearch] = useState(false);

  const fetchUsersData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get all users
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      // Process user data and calculate statistics
      const userData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt ? new Date(doc.data().createdAt) : new Date()
      }));
      
      // Sort by creation date (newest first)
      userData.sort((a, b) => b.createdAt - a.createdAt);
      
      setUsers(userData);
      setFilteredUsers(userData);
      
      // Calculate statistics
      const studentCount = userData.filter(user => user.role === 'student').length;
      const tutorCount = userData.filter(user => user.role === 'tutor').length;
      const adminCount = userData.filter(user => user.role === 'admin').length;
      
      // Get pending tutor applications
      const tutorAppsRef = collection(db, 'tutorApplications');
      const pendingQuery = query(tutorAppsRef, where('status', '==', 'pending'));
      const pendingSnapshot = await getDocs(pendingQuery);
      const pendingCount = pendingSnapshot.docs.length;
      
      // Calculate users who logged in within the last 30 days (if lastLogin exists)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const activeUsers = userData.filter(user => 
        user.lastLogin && new Date(user.lastLogin) > thirtyDaysAgo
      ).length;
      
      // Calculate new users in the last 7 and prior 7 days
      const now = new Date();
      const oneWeekAgo = new Date(now);
      oneWeekAgo.setDate(now.getDate() - 7);
      const twoWeeksAgo = new Date(now);
      twoWeeksAgo.setDate(now.getDate() - 14);
      
      const newUsersThisWeek = userData.filter(user => 
        user.createdAt >= oneWeekAgo && user.createdAt <= now
      ).length;
      
      const newUsersLastWeek = userData.filter(user => 
        user.createdAt >= twoWeeksAgo && user.createdAt < oneWeekAgo
      ).length;
      
      // Update the stats
      setStats({
        totalUsers: userData.length,
        students: studentCount,
        tutors: tutorCount,
        admins: adminCount,
        pendingTutors: pendingCount,
        activeUsers: activeUsers || 0, // Default to 0 if lastLogin data doesn't exist
        newUsersThisWeek,
        newUsersLastWeek
      });
      
      // Calculate user signups by day of week
      const dayOfWeekData = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat
      
      userData.forEach(user => {
        if (user.createdAt) {
          const dayOfWeek = user.createdAt.getDay(); // 0 = Sunday, 6 = Saturday
          dayOfWeekData[dayOfWeek]++;
        }
      });
      
      // Rearrange for Mon-Sun format
      const rearrangedDayData = [...dayOfWeekData.slice(1), dayOfWeekData[0]];
      
      setUserActivityData({
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{ data: rearrangedDayData }]
      });
      
      setChartLoading(false);
      
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  
  useEffect(() => {
    fetchUsersData();
  }, [fetchUsersData]);
  
  const onRefresh = () => {
    setRefreshing(true);
    fetchUsersData();
  };
  
  const toggleSearch = () => {
    setShowingSearch(!showingSearch);
    if (!showingSearch) {
      setSearchQuery('');
      setFilteredUsers(users);
    }
  };
  
  const onChangeSearch = (query) => {
    setSearchQuery(query);
    
    if (query.trim() === '') {
      applyRoleFilter(selectedFilter);
      return;
    }
    
    const lowercaseQuery = query.toLowerCase();
    const filtered = users.filter(user => 
      (user.fullName && user.fullName.toLowerCase().includes(lowercaseQuery)) ||
      (user.email && user.email.toLowerCase().includes(lowercaseQuery)) ||
      (user.role && user.role.toLowerCase().includes(lowercaseQuery))
    );
    
    setFilteredUsers(filtered);
  };
  
  const applyRoleFilter = (filter) => {
    setSelectedFilter(filter);
    
    if (filter === 'all') {
      setFilteredUsers(users);
      return;
    }
    
    const filtered = users.filter(user => user.role === filter);
    setFilteredUsers(filtered);
  };
  
  const handleManageUser = (user) => {
    setSelectedUser(user);
    setMenuVisible(true);
  };
  
  const handleDeleteUser = (userId) => {
    // Here you would implement the actual user deletion logic
    alert(`Delete user: ${userId} would be implemented here`);
    setMenuVisible(false);
  };
  
  const handleEditUser = (user) => {
    // Here you would navigate to edit user screen
    alert(`Edit user: ${user.email} would be implemented here`);
    setMenuVisible(false);
  };
  
  const handleToggleUserStatus = async (user) => {
    try {
      const isCurrentlyActive = user.isActive !== false; // Default to true if undefined
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        isActive: !isCurrentlyActive
      });
      
      // Update local state
      const updatedUsers = users.map(u => 
        u.id === user.id ? { ...u, isActive: !isCurrentlyActive } : u
      );
      setUsers(updatedUsers);
      applyRoleFilter(selectedFilter);
      
      setMenuVisible(false);
    } catch (error) {
      console.error('Error toggling user status:', error);
      alert('Failed to update user status');
    }
  };
  
  const renderUserItem = ({ item }) => (
    <Card style={styles.userCard} mode="outlined">
      <Card.Content>
        <View style={styles.userCardHeader}>
          <View style={styles.userInfoContainer}>
            <Avatar.Text 
              size={40} 
              label={item.fullName ? item.fullName.substring(0, 2).toUpperCase() : 'U'} 
              backgroundColor={
                item.role === 'admin' ? '#9C27B0' : 
                item.role === 'tutor' ? '#2196F3' : '#4CAF50'
              }
            />
            <View style={styles.userTextInfo}>
              <Text style={styles.userName}>{item.fullName || 'Unnamed User'}</Text>
              <Text style={styles.userEmail}>{item.email}</Text>
              <View style={styles.userMetaContainer}>
                <Chip 
                  mode="flat" 
                  style={[styles.roleChip, { 
                    backgroundColor: 
                      item.role === 'admin' ? '#9C27B070' : 
                      item.role === 'tutor' ? '#2196F370' : '#4CAF5070'
                  }]}
                  textStyle={{ 
                    color: 
                      item.role === 'admin' ? '#9C27B0' : 
                      item.role === 'tutor' ? '#2196F3' : '#4CAF50',
                    fontWeight: 'bold'
                  }}
                >
                  {item.role?.toUpperCase()}
                </Chip>
                {item.isActive === false && (
                  <Chip 
                    style={[styles.statusChip, { backgroundColor: '#F4433670' }]}
                    textStyle={{ color: '#F44336', fontWeight: 'bold' }}
                  >
                    INACTIVE
                  </Chip>
                )}
              </View>
            </View>
          </View>
          <IconButton
            icon="dots-vertical"
            size={24}
            onPress={() => handleManageUser(item)}
          />
        </View>
        
        <View style={styles.userDetailsContainer}>
          <Text style={styles.userDateInfo}>
            Joined: {item.createdAt.toLocaleDateString()}
          </Text>
          {item.role === 'tutor' && (
            <View style={styles.tutorStatsContainer}>
              <Text style={styles.tutorStat}>
                Rating: {item.rating?.toFixed(1) || 'N/A'} 
                {item.totalReviews > 0 && ` (${item.totalReviews})`}
              </Text>
              <Text style={styles.tutorStat}>
                Subjects: {item.subjects?.length || 0}
              </Text>
            </View>
          )}
        </View>
      </Card.Content>
    </Card>
  );
  
  const renderCharts = () => (
    <>
      <Card style={styles.chartCard}>
        <Card.Content>
          <Text style={styles.cardTitle}>User Distribution</Text>
          <View style={styles.chartContainer}>
            {chartLoading ? (
              <ActivityIndicator size="large" color="#9C27B0" />
            ) : (
              <PieChart
                data={[
                  {
                    name: 'Students',
                    population: stats.students,
                    color: '#4CAF50',
                    legendFontColor: '#7F7F7F',
                    legendFontSize: 13,
                  },
                  {
                    name: 'Tutors',
                    population: stats.tutors,
                    color: '#2196F3',
                    legendFontColor: '#7F7F7F',
                    legendFontSize: 13,
                  },
                  {
                    name: 'Admins',
                    population: stats.admins,
                    color: '#9C27B0',
                    legendFontColor: '#7F7F7F',
                    legendFontSize: 13,
                  },
                ]}
                width={screenWidth - 60}
                height={180}
                chartConfig={{
                  backgroundColor: '#FFFFFF',
                  backgroundGradientFrom: '#FFFFFF',
                  backgroundGradientTo: '#FFFFFF',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                }}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
              />
            )}
          </View>
        </Card.Content>
      </Card>
      
      <Card style={styles.chartCard}>
        <Card.Content>
          <Text style={styles.cardTitle}>Signups by Day of Week</Text>
          <View style={styles.chartContainer}>
            {chartLoading ? (
              <ActivityIndicator size="large" color="#9C27B0" />
            ) : (
              <LineChart
                data={userActivityData}
                width={screenWidth - 60}
                height={220}
                chartConfig={{
                  backgroundColor: '#FFFFFF',
                  backgroundGradientFrom: '#FFFFFF',
                  backgroundGradientTo: '#FFFFFF',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(156, 39, 176, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  propsForDots: {
                    r: '6',
                    strokeWidth: '2',
                    stroke: '#9C27B0',
                  },
                  propsForBackgroundLines: {
                    strokeDasharray: '',
                  },
                }}
                bezier
                style={{
                  marginVertical: 8,
                  borderRadius: 16,
                }}
              />
            )}
          </View>
        </Card.Content>
      </Card>
    </>
  );
  
  const renderStatCards = () => (
    <View style={styles.statsGrid}>
      <Card style={[styles.statCard, styles.purpleCard]}>
        <Card.Content>
          <MaterialIcons name="people" size={24} color="#FFF" style={styles.statIcon} />
          <Text style={styles.statTitle}>Total Users</Text>
          <Text style={styles.statValue}>{stats.totalUsers}</Text>
        </Card.Content>
      </Card>
      
      <Card style={[styles.statCard, styles.greenCard]}>
        <Card.Content>
          <MaterialIcons name="school" size={24} color="#FFF" style={styles.statIcon} />
          <Text style={styles.statTitle}>Students</Text>
          <Text style={styles.statValue}>{stats.students}</Text>
        </Card.Content>
      </Card>
      
      <Card style={[styles.statCard, styles.blueCard]}>
        <Card.Content>
          <MaterialIcons name="assignment" size={24} color="#FFF" style={styles.statIcon} />
          <Text style={styles.statTitle}>Tutors</Text>
          <Text style={styles.statValue}>{stats.tutors}</Text>
        </Card.Content>
      </Card>
      
      <Card style={[styles.statCard, styles.orangeCard]}>
        <Card.Content>
          <MaterialIcons name="pending-actions" size={24} color="#FFF" style={styles.statIcon} />
          <Text style={styles.statTitle}>Pending</Text>
          <Text style={styles.statValue}>{stats.pendingTutors}</Text>
        </Card.Content>
      </Card>
    </View>
  );
  
  const renderGrowthCards = () => (
    <View style={styles.growthContainer}>
      <Card style={[styles.growthCard, { backgroundColor: '#E3F2FD' }]}>
        <Card.Content style={styles.growthCardContentWrapper}>
          <MaterialIcons name="trending-up" size={24} color="#2196F3" style={styles.statIcon} />
          <Text style={styles.growthTitle}>New users this week</Text>
          <Text style={styles.growthValue}>{stats.newUsersThisWeek}</Text>
          {stats.newUsersLastWeek > 0 && (
            <Text style={[
              styles.growthCompare, 
              {color: stats.newUsersThisWeek > stats.newUsersLastWeek ? '#4CAF50' : '#F44336'}
            ]}>
              {stats.newUsersThisWeek > stats.newUsersLastWeek ? '↑' : '↓'} 
              {Math.abs(Math.round((stats.newUsersThisWeek - stats.newUsersLastWeek) / stats.newUsersLastWeek * 100))}% 
              from last week
            </Text>
          )}
        </Card.Content>
      </Card>
      
      <Card style={[styles.growthCard, { backgroundColor: '#E8F5E9' }]}>
        <Card.Content style={styles.growthCardContentWrapper}>
          <MaterialIcons name="verified-user" size={24} color="#4CAF50" style={styles.statIcon} />
          <Text style={styles.growthTitle}>Active users</Text>
          <Text style={styles.growthValue}>{stats.activeUsers}</Text>
          {stats.totalUsers > 0 && stats.activeUsers > 0 && (
            <Text style={styles.growthCompare}>
              {Math.round(stats.activeUsers / stats.totalUsers * 100)}% of all users
            </Text>
          )}
        </Card.Content>
      </Card>
    </View>
  );
  
  const renderFilterButtons = () => (
    <View style={styles.filterButtonsContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Button 
          mode={selectedFilter === 'all' ? 'contained' : 'outlined'} 
          onPress={() => applyRoleFilter('all')}
          style={styles.filterButton}
        >
          All
        </Button>
        <Button 
          mode={selectedFilter === 'student' ? 'contained' : 'outlined'} 
          onPress={() => applyRoleFilter('student')}
          style={styles.filterButton}
          buttonColor="#4CAF50"
          textColor={selectedFilter === 'student' ? 'white' : '#ffffff'}
        >
          Students
        </Button>
        <Button 
          mode={selectedFilter === 'tutor' ? 'contained' : 'outlined'} 
          onPress={() => applyRoleFilter('tutor')}
          style={styles.filterButton}
          buttonColor="#2196F3"
          textColor={selectedFilter === 'tutor' ? 'white' : '#ffffff'}
        >
          Tutors
        </Button>
        <Button 
          mode={selectedFilter === 'admin' ? 'contained' : 'outlined'} 
          onPress={() => applyRoleFilter('admin')}
          style={styles.filterButton}
          buttonColor="#9C27B0"
          textColor={selectedFilter === 'admin' ? 'white' : '#ffffff'}
        >
          Admins
        </Button>
      </ScrollView>
    </View>
  );
  
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9C27B0" />
        <Text style={styles.loadingText}>Loading user data...</Text>
      </View>
    );
  }
  
  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>User Management</Text>
        <IconButton
          icon={showingSearch ? "close" : "magnify"}
          size={24}
          onPress={toggleSearch}
        />
      </View>
      
      {showingSearch ? (
        <Searchbar
          placeholder="Search users..."
          onChangeText={onChangeSearch}
          value={searchQuery}
          style={styles.searchBar}
        />
      ) : (
        <ScrollView
          style={styles.dashboard}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {renderStatCards()}
          {renderGrowthCards()}
          {renderCharts()}
        </ScrollView>
      )}
      
      {showingSearch && (
        <>
          {renderFilterButtons()}
          
          <FlatList
            data={filteredUsers}
            renderItem={renderUserItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.usersList}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialIcons name="search-off" size={48} color="#9E9E9E" />
                <Text style={styles.emptyText}>No users found</Text>
              </View>
            }
          />
          
          <Menu
            visible={menuVisible}
            onDismiss={() => {
              setMenuVisible(false);
              setSelectedUser(null);
            }}
            anchor={{ x: screenWidth - 40, y: 100 }}
          >
            <Menu.Item 
              onPress={() => handleEditUser(selectedUser)} 
              title="Edit User"
              leadingIcon="account-edit"
            />
            <Menu.Item 
              onPress={() => handleToggleUserStatus(selectedUser)}
              title={selectedUser?.isActive === false ? "Activate User" : "Deactivate User"}
              leadingIcon={selectedUser?.isActive === false ? "account-check" : "account-cancel"}
            />
            <Divider />
            <Menu.Item 
              onPress={() => handleDeleteUser(selectedUser?.id)}
              title="Delete User"
              leadingIcon="delete"
              titleStyle={{ color: '#F44336' }}
            />
          </Menu>
        </>
      )}
      
      {!showingSearch && (
        <FAB
          style={styles.fab}
          icon="account-search"
          onPress={toggleSearch}
          label="Search Users"
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingTop: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 56,
    backgroundColor: '#FFFFFF',
    elevation: 2,
    marginTop: 0,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
  },
  searchBar: {
    margin: 8,
    elevation: 2,
  },
  dashboard: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 8,
  },
  statCard: {
    width: '48%',
    marginBottom: 8,
    borderRadius: 12,
    elevation: 2,
  },
  purpleCard: {
    backgroundColor: '#9C27B0',
  },
  greenCard: {
    backgroundColor: '#4CAF50',
  },
  blueCard: {
    backgroundColor: '#2196F3',
  },
  orangeCard: {
    backgroundColor: '#FF9800',
  },
  statIcon: {
    marginBottom: 8,
  },
  statTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  growthContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 8,
    paddingTop: 0,
  },
  growthCard: {
    width: '48%',
    marginBottom: 8,
    borderRadius: 12,
    elevation: 2,
  },
  growthCardContentWrapper: {
    padding: 16,
  },
  growthTitle: {
    color: '#333333',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  growthValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
  growthCompare: {
    fontSize: 12,
    marginTop: 4,
    color: '#666666',
  },
  chartCard: {
    margin: 8,
    borderRadius: 12,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333333',
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  usersList: {
    paddingHorizontal: 8,
  },
  userCard: {
    marginBottom: 8,
    borderRadius: 12,
    elevation: 1,
  },
  userCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userTextInfo: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  userEmail: {
    fontSize: 14,
    color: '#666666',
  },
  userMetaContainer: {
    flexDirection: 'row',
    marginTop: 6,
    flexWrap: 'wrap',
  },
  roleChip: {
    marginRight: 8,
    height: 30,
  },
  statusChip: {
    height: 24,
  },
  userDetailsContainer: {
    marginTop: 12,
  },
  userDateInfo: {
    fontSize: 12,
    color: '#666666',
  },
  tutorStatsContainer: {
    flexDirection: 'row',
    marginTop: 6,
    flexWrap: 'wrap',
  },
  tutorStat: {
    fontSize: 12,
    color: '#666666',
    marginRight: 12,
  },
  filterButtonsContainer: {
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 2,
    borderBottomColor: '#EEEEEE',
  },
  filterButton: {
    marginHorizontal: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#9E9E9E',
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#9C27B0',
  },
});

export default ManageUsersScreen; 