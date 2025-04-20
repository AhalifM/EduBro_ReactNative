import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, Animated, RefreshControl, FlatList } from 'react-native';
import { Text, TextInput, Button, useTheme, Card, Divider, Surface, Chip, ActivityIndicator } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase/config';
import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy } from 'firebase/firestore';

const ISSUE_CATEGORIES = [
  'Payment Problem',
  'Booking Issue',
  'Tutor Behavior',
  'Student Behavior',
  'Account Problem',
  'App Bug',
  'Other'
];

const ReportIssueScreen = ({ navigation }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [userIssues, setUserIssues] = useState([]);
  const [filteredIssues, setFilteredIssues] = useState([]);
  const [fetchingIssues, setFetchingIssues] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const { user } = useAuth();
  const theme = useTheme();

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

  // Define filter tabs
  const FILTER_TABS = [
    { id: 'all', label: 'All' },
    { id: 'pending', label: 'Pending' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'resolved', label: 'Resolved' },
    { id: 'rejected', label: 'Rejected' },
  ];

  // Apply filter based on the selected status
  const applyFilter = (status, issues) => {
    const issuesToFilter = issues || userIssues;
    if (status === 'all') {
      setFilteredIssues(issuesToFilter);
    } else {
      setFilteredIssues(issuesToFilter.filter(issue => issue.status === status));
    }
  };

  // Fetch user's reported issues
  const fetchUserIssues = useCallback(async () => {
    if (!user || !user.uid) return;
    
    try {
      setFetchingIssues(true);
      
      const issuesQuery = query(
        collection(db, 'reportedIssues'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(issuesQuery);
      const issuesList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      }));
      
      setUserIssues(issuesList);
      applyFilter(activeFilter, issuesList);
    } catch (error) {
      console.error('Error fetching user issues:', error);
    } finally {
      setFetchingIssues(false);
      setRefreshing(false);
    }
  }, [user, activeFilter]);
  
  useEffect(() => {
    fetchUserIssues();
  }, [fetchUserIssues]);
  
  // Update filter when tab changes
  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    applyFilter(filter);
  };
  
  const onRefresh = () => {
    setRefreshing(true);
    fetchUserIssues();
  };

  const handleCategorySelect = (category) => {
    console.log('Selected category:', category);
    setSelectedCategory(category);
    setMenuVisible(false);
    if (category === 'Other') {
      setCustomTitle('');
      setTitle('');
    } else {
      setTitle(category);
      setCustomTitle('');
    }
  };

  const handleSubmit = async () => {
    const finalTitle = selectedCategory === 'Other' ? customTitle.trim() : title.trim();
    
    if (!finalTitle || !description.trim()) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    try {
      setLoading(true);

      const reportData = {
        title: finalTitle,
        category: selectedCategory,
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

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };
  
  // Render an individual issue item
  const renderIssueItem = ({ item }) => (
    <Card style={styles.issueCard} onPress={() => navigation.navigate('IssueDetail', { issueId: item.id })}>
      <Card.Content>
        <View style={styles.issueHeaderRow}>
          <View style={styles.issueTitle}>
            <Text style={styles.issueTitleText} numberOfLines={1} ellipsizeMode="tail">
              {item.title}
            </Text>
            <Chip 
              style={[styles.statusChip, { backgroundColor: STATUS_COLORS[item.status] }]}
              textStyle={styles.statusChipText}
            >
              {STATUS_LABELS[item.status]}
            </Chip>
          </View>
        </View>
        
        <View style={styles.issueDetailsRow}>
          <MaterialIcons name="category" size={16} color="#666" style={styles.issueIcon} />
          <Text style={styles.issueDetailText}>{item.category}</Text>
        </View>
        
        <View style={styles.issueDetailsRow}>
          <MaterialIcons name="access-time" size={16} color="#666" style={styles.issueIcon} />
          <Text style={styles.issueDetailText}>Reported on {formatDate(item.createdAt)}</Text>
        </View>
        
        <Text style={styles.issueDescription} numberOfLines={2} ellipsizeMode="tail">
          {item.description}
        </Text>
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={[theme.colors.primary]} 
          />
        }
      >
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.headerText}>Report an Issue</Text>
            <Text style={styles.subHeaderText}>
              Please provide details about the issue you're experiencing
            </Text>

            <View style={styles.categoryContainer}>
              <Surface style={styles.categorySurface} elevation={1}>
                <TouchableOpacity
                  onPress={() => setMenuVisible(!menuVisible)}
                  style={styles.categoryButton}
                >
                  <View style={styles.categoryButtonContent}>
                    <Text style={[
                      styles.categoryButtonText,
                      !selectedCategory && styles.categoryButtonPlaceholder
                    ]}>
                      {selectedCategory || 'Select Issue Category'}
                    </Text>
                    <MaterialIcons 
                      name={menuVisible ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                      size={24} 
                      color="#9C27B0"
                    />
                  </View>
                </TouchableOpacity>
              </Surface>

              {menuVisible && (
                <View style={styles.categoryOptionsContainer}>
                  {ISSUE_CATEGORIES.map((category, index) => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.categoryOption,
                        selectedCategory === category && styles.selectedCategoryOption
                      ]}
                      onPress={() => {
                        console.log('Category button pressed:', category);
                        handleCategorySelect(category);
                      }}
                    >
                      <Text style={[
                        styles.categoryOptionText,
                        selectedCategory === category && styles.selectedCategoryOptionText
                      ]}>
                        {category}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {selectedCategory === 'Other' && (
              <TextInput
                label="Issue Title"
                value={customTitle}
                onChangeText={setCustomTitle}
                mode="outlined"
                style={styles.input}
                outlineColor={theme.colors.primary}
                activeOutlineColor={theme.colors.primary}
                placeholder="Please specify your issue"
              />
            )}

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
              disabled={loading || !selectedCategory || !description.trim() || (selectedCategory === 'Other' && !customTitle.trim())}
              style={styles.submitButton}
              buttonColor={theme.colors.primary}
            >
              Submit Report
            </Button>
          </Card.Content>
        </Card>

        {/* My Reported Issues Section */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.headerText}>My Reported Issues</Text>
            <Text style={styles.subHeaderText}>
              Track the status of your previously reported issues
            </Text>

            {/* Status Filter Tabs */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterTabsContainer}
            >
              {FILTER_TABS.map((tab) => (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => handleFilterChange(tab.id)}
                  style={[
                    styles.filterTab,
                    activeFilter === tab.id && styles.activeFilterTab,
                    tab.id !== 'all' && { backgroundColor: STATUS_COLORS[tab.id] + '20' }, // Light version of the status color
                    activeFilter === tab.id && tab.id !== 'all' && { backgroundColor: STATUS_COLORS[tab.id] + '40' }, // Darker when active
                  ]}
                >
                  <Text 
                    style={[
                      styles.filterTabText,
                      activeFilter === tab.id && styles.activeFilterTabText,
                      tab.id !== 'all' && { color: STATUS_COLORS[tab.id] }
                    ]}
                  >
                    {tab.label}
                    {tab.id !== 'all' && (
                      <Text style={styles.filterTabCount}>
                        {` (${userIssues.filter(issue => issue.status === tab.id).length})`}
                      </Text>
                    )}
                    {tab.id === 'all' && (
                      <Text style={styles.filterTabCount}>
                        {` (${userIssues.length})`}
                      </Text>
                    )}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {fetchingIssues && !refreshing ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Loading your issues...</Text>
              </View>
            ) : filteredIssues.length > 0 ? (
              <View style={styles.issuesList}>
                {filteredIssues.map(issue => renderIssueItem({ item: issue }))}
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="inbox" size={64} color="#9E9E9E" />
                <Text style={styles.emptyText}>
                  {activeFilter === 'all'
                    ? "You haven't reported any issues yet"
                    : `No ${STATUS_LABELS[activeFilter].toLowerCase()} issues found`}
                </Text>
                {activeFilter !== 'all' && (
                  <Button 
                    mode="outlined" 
                    onPress={() => handleFilterChange('all')}
                    style={styles.showAllButton}
                  >
                    Show All Issues
                  </Button>
                )}
              </View>
            )}
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
  categoryContainer: {
    marginBottom: 16,
    zIndex: 1,
  },
  categorySurface: {
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  categoryButton: {
    width: '100%',
  },
  categoryButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  categoryButtonText: {
    fontSize: 16,
    color: '#333',
  },
  categoryButtonPlaceholder: {
    color: '#666',
  },
  categoryOptionsContainer: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 4,
    padding: 8,
  },
  categoryOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginBottom: 4,
  },
  selectedCategoryOption: {
    backgroundColor: '#f0e6f5',
  },
  categoryOptionText: {
    fontSize: 16,
    color: '#333',
  },
  selectedCategoryOptionText: {
    color: '#9C27B0',
    fontWeight: '500',
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
  // New styles for issues list
  issuesList: {
    marginTop: 16,
  },
  issueCard: {
    marginBottom: 12,
    borderRadius: 8,
    elevation: 2,
  },
  issueHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  issueTitle: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  issueTitleText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  statusChip: {
    height: 24,
    paddingHorizontal: 8,
  },
  statusChipText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '500',
  },
  issueDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  issueIcon: {
    marginRight: 6,
  },
  issueDetailText: {
    fontSize: 13,
    color: '#666',
  },
  issueDescription: {
    fontSize: 14,
    color: '#444',
    marginTop: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 8,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 8,
    color: '#666',
    textAlign: 'center',
  },
  filterTabsContainer: {
    flexDirection: 'row',
    marginVertical: 16,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  activeFilterTab: {
    backgroundColor: '#f0e6f5',
  },
  filterTabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeFilterTabText: {
    color: '#9C27B0',
    fontWeight: 'bold',
  },
  filterTabCount: {
    fontSize: 13,
    fontWeight: 'normal',
  },
  showAllButton: {
    marginTop: 16,
  },
});

export default ReportIssueScreen; 