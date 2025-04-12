import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, Alert, RefreshControl, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import { Text, Card, Button, Chip, Divider, Searchbar, IconButton, Menu, ActivityIndicator, Modal, Portal, Title, Badge, Avatar, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { db } from '../../firebase/config';
import { collection, query, orderBy, getDocs, doc, updateDoc, addDoc } from 'firebase/firestore';

const { width } = Dimensions.get('window');

const STATUS_COLORS = {
  pending: '#FFC107', // Yellow
  in_progress: '#2196F3', // Blue
  resolved: '#4CAF50', // Green
  rejected: '#F44336', // Red
};

const STATUS_ICONS = {
  pending: 'clock-alert-outline',
  in_progress: 'progress-clock',
  resolved: 'check-circle-outline',
  rejected: 'cancel',
};

const ReportedIssuesScreen = () => {
  const [issues, setIssues] = useState([]);
  const [filteredIssues, setFilteredIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailIssue, setDetailIssue] = useState(null);
  const [addNoteVisible, setAddNoteVisible] = useState(false);
  const [adminNote, setAdminNote] = useState('');
  const [issueStats, setIssueStats] = useState({
    pending: 0,
    in_progress: 0,
    resolved: 0,
    rejected: 0,
    total: 0
  });

  const fetchIssues = useCallback(async () => {
    try {
      setLoading(true);
      const issuesQuery = query(
        collection(db, 'reportedIssues'),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(issuesQuery);
      const issueList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      }));
      
      // Calculate stats
      const stats = {
        pending: issueList.filter(issue => issue.status === 'pending').length,
        in_progress: issueList.filter(issue => issue.status === 'in_progress').length,
        resolved: issueList.filter(issue => issue.status === 'resolved').length,
        rejected: issueList.filter(issue => issue.status === 'rejected').length,
        total: issueList.length
      };
      setIssueStats(stats);
      
      setIssues(issueList);
      applyFilters(issueList, searchQuery, filterStatus);
    } catch (error) {
      console.error('Error fetching issues:', error);
      Alert.alert('Error', 'Failed to load reported issues');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, filterStatus]);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  const applyFilters = (issueList, query, status) => {
    let filtered = [...issueList];
    
    // Apply search query filter
    if (query) {
      const lowerCaseQuery = query.toLowerCase();
      filtered = filtered.filter(
        issue => 
          issue.title?.toLowerCase().includes(lowerCaseQuery) ||
          issue.description?.toLowerCase().includes(lowerCaseQuery) ||
          issue.userName?.toLowerCase().includes(lowerCaseQuery) ||
          issue.userEmail?.toLowerCase().includes(lowerCaseQuery)
      );
    }
    
    // Apply status filter
    if (status !== 'all') {
      filtered = filtered.filter(issue => issue.status === status);
    }
    
    setFilteredIssues(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchIssues();
  };

  const onChangeSearch = query => {
    setSearchQuery(query);
    applyFilters(issues, query, filterStatus);
  };

  const onFilterChange = status => {
    setFilterStatus(status);
    applyFilters(issues, searchQuery, status);
  };

  const updateIssueStatus = async (issueId, newStatus) => {
    try {
      setLoading(true);
      const issueRef = doc(db, 'reportedIssues', issueId);
      await updateDoc(issueRef, {
        status: newStatus,
        updatedAt: new Date(),
      });
      
      // Update local state
      const updatedIssues = issues.map(issue => 
        issue.id === issueId ? { ...issue, status: newStatus, updatedAt: new Date() } : issue
      );
      
      setIssues(updatedIssues);
      
      // If we're updating the currently viewed issue, update it too
      if (detailIssue && detailIssue.id === issueId) {
        setDetailIssue({...detailIssue, status: newStatus, updatedAt: new Date()});
      }
      
      applyFilters(updatedIssues, searchQuery, filterStatus);
      
      // Update stats
      const newStats = {...issueStats};
      if (selectedIssue) {
        const oldIssue = issues.find(i => i.id === issueId);
        if (oldIssue) {
          newStats[oldIssue.status] = Math.max(0, newStats[oldIssue.status] - 1);
        }
      }
      newStats[newStatus]++;
      setIssueStats(newStats);
      
      Alert.alert('Success', `Issue status updated to ${newStatus.replace('_', ' ')}`);
    } catch (error) {
      console.error('Error updating issue status:', error);
      Alert.alert('Error', 'Failed to update issue status');
    } finally {
      setLoading(false);
      setSelectedIssue(null);
      setMenuVisible(false);
    }
  };
  
  const addAdminNote = async () => {
    if (!adminNote.trim() || !detailIssue) return;
    
    try {
      setLoading(true);
      
      // Create note object
      const note = {
        text: adminNote.trim(),
        timestamp: new Date(),
        issueId: detailIssue.id
      };
      
      // Add to Firestore
      await addDoc(collection(db, 'issueNotes'), note);
      
      // Update issue with note reference
      const issueRef = doc(db, 'reportedIssues', detailIssue.id);
      await updateDoc(issueRef, {
        hasAdminNotes: true,
        updatedAt: new Date()
      });
      
      // Clear input and close modal
      setAdminNote('');
      setAddNoteVisible(false);
      
      // Refresh issues
      fetchIssues();
      
      Alert.alert('Success', 'Note added successfully');
    } catch (error) {
      console.error('Error adding note:', error);
      Alert.alert('Error', 'Failed to add note');
    } finally {
      setLoading(false);
    }
  };

  const showIssueDetails = (issue) => {
    setDetailIssue(issue);
    setModalVisible(true);
  };

  const renderIssueItem = ({ item }) => {
    const formattedDate = item.createdAt.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    
    const urgencyLevel = item.urgency || 'medium';
    const urgencyColors = {
      low: '#4CAF50',
      medium: '#FFC107',
      high: '#F44336'
    };

    return (
      <TouchableOpacity onPress={() => showIssueDetails(item)}>
        <Card style={[styles.card, { borderLeftWidth: 5, borderLeftColor: STATUS_COLORS[item.status] }]} mode="outlined">
          <Card.Content>
            <View style={styles.headerRow}>
              <View style={styles.titleContainer}>
                <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                <View style={styles.chipContainer}>
                  <Chip 
                    mode="flat" 
                    style={[styles.statusChip, { backgroundColor: STATUS_COLORS[item.status] + '20' }]}
                    textStyle={{ color: STATUS_COLORS[item.status], fontWeight: 'bold' }}
                  >
                    <MaterialIcons name={STATUS_ICONS[item.status]} size={14} color={STATUS_COLORS[item.status]} /> 
                    {item.status.replace('_', ' ')}
                  </Chip>
                  
                  {urgencyLevel && (
                    <Chip 
                      mode="flat" 
                      style={[styles.urgencyChip, { backgroundColor: urgencyColors[urgencyLevel] + '20' }]}
                      textStyle={{ color: urgencyColors[urgencyLevel], fontWeight: 'bold' }}
                    >
                      {urgencyLevel.toUpperCase()}
                    </Chip>
                  )}
                  
                  {item.hasAdminNotes && (
                    <MaterialIcons name="comment" size={16} color="#9C27B0" style={styles.noteIcon} />
                  )}
                </View>
              </View>
              <IconButton
                icon="dots-vertical"
                size={20}
                onPress={() => {
                  setSelectedIssue(item.id);
                  setMenuVisible(true);
                }}
              />
            </View>
            
            <View style={styles.userInfoRow}>
              <Avatar.Text 
                size={24} 
                label={item.userName ? item.userName.substring(0, 1).toUpperCase() : 'U'} 
                backgroundColor={item.userRole === 'tutor' ? '#2196F3' : '#4CAF50'}
                style={styles.userAvatar}
              />
              <Text style={styles.reporterInfo}>
                {item.userName} ({item.userRole})
              </Text>
              <Text style={styles.dateInfo}>
                {formattedDate}
              </Text>
            </View>
            
            <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
            
            <Text style={styles.viewMoreText}>Tap to view details</Text>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderStatusBadges = () => (
    <View style={styles.statusBadgesContainer}>
      <View style={styles.statusBadge}>
        <Badge style={[styles.badge, {backgroundColor: STATUS_COLORS.pending}]} size={24}>
          {issueStats.pending}
        </Badge>
        <Text style={styles.badgeLabel}>Pending</Text>
      </View>
      
      <View style={styles.statusBadge}>
        <Badge style={[styles.badge, {backgroundColor: STATUS_COLORS.in_progress}]} size={24}>
          {issueStats.in_progress}
        </Badge>
        <Text style={styles.badgeLabel}>In Progress</Text>
      </View>
      
      <View style={styles.statusBadge}>
        <Badge style={[styles.badge, {backgroundColor: STATUS_COLORS.resolved}]} size={24}>
          {issueStats.resolved}
        </Badge>
        <Text style={styles.badgeLabel}>Resolved</Text>
      </View>
      
      <View style={styles.statusBadge}>
        <Badge style={[styles.badge, {backgroundColor: STATUS_COLORS.rejected}]} size={24}>
          {issueStats.rejected}
        </Badge>
        <Text style={styles.badgeLabel}>Rejected</Text>
      </View>
    </View>
  );

  const renderFilterButtons = () => (
    <View style={styles.filterContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Button
          mode={filterStatus === 'all' ? 'contained' : 'outlined'}
          onPress={() => onFilterChange('all')}
          style={styles.filterButton}
          labelStyle={styles.filterButtonLabel}
        >
          All ({issueStats.total})
        </Button>
        <Button
          mode={filterStatus === 'pending' ? 'contained' : 'outlined'}
          onPress={() => onFilterChange('pending')}
          style={styles.filterButton}
          buttonColor={STATUS_COLORS.pending}
          textColor={filterStatus === 'pending' ? 'white' : STATUS_COLORS.pending}
        >
          Pending ({issueStats.pending})
        </Button>
        <Button
          mode={filterStatus === 'in_progress' ? 'contained' : 'outlined'}
          onPress={() => onFilterChange('in_progress')}
          style={styles.filterButton}
          buttonColor={STATUS_COLORS.in_progress}
          textColor={filterStatus === 'in_progress' ? 'white' : STATUS_COLORS.in_progress}
        >
          In Progress ({issueStats.in_progress})
        </Button>
        <Button
          mode={filterStatus === 'resolved' ? 'contained' : 'outlined'}
          onPress={() => onFilterChange('resolved')}
          style={styles.filterButton}
          buttonColor={STATUS_COLORS.resolved}
          textColor={filterStatus === 'resolved' ? 'white' : STATUS_COLORS.resolved}
        >
          Resolved ({issueStats.resolved})
        </Button>
        <Button
          mode={filterStatus === 'rejected' ? 'contained' : 'outlined'}
          onPress={() => onFilterChange('rejected')}
          style={styles.filterButton}
          buttonColor={STATUS_COLORS.rejected}
          textColor={filterStatus === 'rejected' ? 'white' : STATUS_COLORS.rejected}
        >
          Rejected ({issueStats.rejected})
        </Button>
      </ScrollView>
    </View>
  );
  
  const renderIssueDetailModal = () => (
    <Portal>
      <Modal
        visible={modalVisible}
        onDismiss={() => setModalVisible(false)}
        contentContainerStyle={styles.modalContainer}
      >
        {detailIssue && (
          <ScrollView style={styles.modalScrollView}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <Title style={styles.modalTitle}>{detailIssue.title}</Title>
                <Chip 
                  mode="flat" 
                  style={[styles.statusChip, { backgroundColor: STATUS_COLORS[detailIssue.status] + '20' }]}
                  textStyle={{ color: STATUS_COLORS[detailIssue.status], fontWeight: 'bold' }}
                >
                  <MaterialIcons name={STATUS_ICONS[detailIssue.status]} size={14} color={STATUS_COLORS[detailIssue.status]} /> 
                  {detailIssue.status.replace('_', ' ')}
                </Chip>
              </View>
              <IconButton
                icon="close"
                size={24}
                onPress={() => setModalVisible(false)}
              />
            </View>
            
            <Card style={styles.modalCard}>
              <Card.Content>
                <Text style={styles.sectionTitle}>Reporter Information</Text>
                <View style={styles.reporterDetailRow}>
                  <MaterialIcons name="person" size={18} color="#666" />
                  <Text style={styles.reporterDetailText}>
                    {detailIssue.userName} ({detailIssue.userRole})
                  </Text>
                </View>
                <View style={styles.reporterDetailRow}>
                  <MaterialIcons name="email" size={18} color="#666" />
                  <Text style={styles.reporterDetailText}>
                    {detailIssue.userEmail}
                  </Text>
                </View>
                <View style={styles.reporterDetailRow}>
                  <MaterialIcons name="calendar-today" size={18} color="#666" />
                  <Text style={styles.reporterDetailText}>
                    Reported on: {detailIssue.createdAt.toLocaleString()}
                  </Text>
                </View>
                {detailIssue.updatedAt && (
                  <View style={styles.reporterDetailRow}>
                    <MaterialIcons name="update" size={18} color="#666" />
                    <Text style={styles.reporterDetailText}>
                      Last updated: {detailIssue.updatedAt.toLocaleString()}
                    </Text>
                  </View>
                )}
              </Card.Content>
            </Card>
            
            <Card style={styles.modalCard}>
              <Card.Content>
                <Text style={styles.sectionTitle}>Issue Description</Text>
                <Text style={styles.descriptionDetailText}>
                  {detailIssue.description}
                </Text>
              </Card.Content>
            </Card>
            
            <View style={styles.actionButtonsContainer}>
              <Button 
                mode="contained"
                style={[styles.actionButton, {backgroundColor: STATUS_COLORS.in_progress}]}
                disabled={detailIssue.status === 'in_progress'}
                onPress={() => updateIssueStatus(detailIssue.id, 'in_progress')}
              >
                Mark In Progress
              </Button>
              <Button 
                mode="contained"
                style={[styles.actionButton, {backgroundColor: STATUS_COLORS.resolved}]}
                disabled={detailIssue.status === 'resolved'}
                onPress={() => updateIssueStatus(detailIssue.id, 'resolved')}
              >
                Mark Resolved
              </Button>
              <Button 
                mode="contained"
                style={[styles.actionButton, {backgroundColor: STATUS_COLORS.rejected}]}
                disabled={detailIssue.status === 'rejected'}
                onPress={() => updateIssueStatus(detailIssue.id, 'rejected')}
              >
                Reject Issue
              </Button>
              <Button 
                mode="contained"
                style={[styles.actionButton, {backgroundColor: '#9C27B0'}]}
                onPress={() => setAddNoteVisible(true)}
              >
                Add Admin Note
              </Button>
            </View>
          </ScrollView>
        )}
      </Modal>
      
      <Modal
        visible={addNoteVisible}
        onDismiss={() => setAddNoteVisible(false)}
        contentContainerStyle={styles.noteModalContainer}
      >
        <Title style={styles.noteModalTitle}>Add Admin Note</Title>
        <TextInput
          label="Note"
          value={adminNote}
          onChangeText={setAdminNote}
          mode="outlined"
          multiline
          numberOfLines={5}
          style={styles.noteInput}
        />
        <View style={styles.noteModalButtons}>
          <Button onPress={() => setAddNoteVisible(false)}>Cancel</Button>
          <Button 
            mode="contained" 
            onPress={addAdminNote}
            disabled={!adminNote.trim()}
          >
            Save Note
          </Button>
        </View>
      </Modal>
    </Portal>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9C27B0" />
        <Text style={styles.loadingText}>Loading issues...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reported Issues</Text>
        <Text style={styles.headerSubtitle}>
          Manage user-reported issues and respond to them
        </Text>
      </View>
      
      {renderStatusBadges()}
      
      <Searchbar
        placeholder="Search issues..."
        onChangeText={onChangeSearch}
        value={searchQuery}
        style={styles.searchBar}
      />
      
      {renderFilterButtons()}
      
      <FlatList
        data={filteredIssues}
        keyExtractor={item => item.id}
        renderItem={renderIssueItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#9C27B0']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="sentiment-satisfied-alt" size={64} color="#9E9E9E" />
            <Text style={styles.emptyText}>
              {searchQuery ? 
                'No issues found matching your search' : 
                filterStatus !== 'all' ? 
                  `No ${filterStatus} issues found` :
                  'No reported issues yet'
              }
            </Text>
            {(searchQuery || filterStatus !== 'all') && (
              <Button 
                mode="outlined" 
                onPress={() => {
                  setSearchQuery('');
                  setFilterStatus('all');
                  applyFilters(issues, '', 'all');
                }}
                style={styles.clearFiltersButton}
              >
                Clear Filters
              </Button>
            )}
          </View>
        }
      />
      
      <Menu
        visible={menuVisible}
        onDismiss={() => {
          setMenuVisible(false);
          setSelectedIssue(null);
        }}
        anchor={{ x: width - 40, y: 100 }}
      >
        <Menu.Item 
          onPress={() => {
            const issue = issues.find(issue => issue.id === selectedIssue);
            if (issue) {
              showIssueDetails(issue);
              setMenuVisible(false);
            }
          }}
          title="View Details" 
          leadingIcon="eye"
        />
        <Divider />
        <Menu.Item 
          onPress={() => updateIssueStatus(selectedIssue, 'in_progress')} 
          title="Mark In Progress" 
          leadingIcon="progress-clock"
          disabled={issues.find(issue => issue.id === selectedIssue)?.status === 'in_progress'}
        />
        <Menu.Item 
          onPress={() => updateIssueStatus(selectedIssue, 'resolved')} 
          title="Mark Resolved"
          leadingIcon="check-circle"
          disabled={issues.find(issue => issue.id === selectedIssue)?.status === 'resolved'}
        />
        <Menu.Item 
          onPress={() => updateIssueStatus(selectedIssue, 'rejected')} 
          title="Reject Issue"
          leadingIcon="cancel"
          disabled={issues.find(issue => issue.id === selectedIssue)?.status === 'rejected'}
        />
        <Divider />
        <Menu.Item 
          onPress={() => updateIssueStatus(selectedIssue, 'pending')} 
          title="Mark Pending"
          leadingIcon="clock-alert"
          disabled={issues.find(issue => issue.id === selectedIssue)?.status === 'pending'}
        />
      </Menu>
      
      {renderIssueDetailModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f7',
  },
  header: {
    backgroundColor: '#8e24aa',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  statusBadgesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 16,
    paddingHorizontal: 8,
  },
  statusBadge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    marginBottom: 4,
  },
  badgeLabel: {
    fontSize: 12,
    color: '#555',
  },
  searchBar: {
    marginHorizontal: 16,
    marginBottom: 12,
    elevation: 2,
    backgroundColor: 'white',
    borderRadius: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  filterButton: {
    marginHorizontal: 4,
    borderRadius: 20,
    paddingHorizontal: 4,
  },
  filterButtonLabel: {
    fontSize: 12,
    marginVertical: 0,
    paddingVertical: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  clearFiltersButton: {
    marginTop: 12,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  card: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  noteIcon: {
    margin: 0,
    padding: 0,
  },
  chipContainer: {
    flexDirection: 'row',
    marginTop: 8,
  },
  statusChip: {
    height: 28,
    marginRight: 8,
  },
  urgencyChip: {
    height: 28,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  userAvatar: {
    marginRight: 8,
  },
  reporterInfo: {
    fontSize: 14,
    color: '#555',
    flex: 1,
  },
  dateInfo: {
    fontSize: 12,
    color: '#888',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  viewMoreText: {
    fontSize: 13,
    color: '#8e24aa',
    marginTop: 8,
    textAlign: 'right',
  },
  modalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 16,
    maxHeight: '90%',
  },
  modalScrollView: {
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitleContainer: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  modalCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 12,
  },
  reporterDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reporterDetailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
  },
  descriptionDetailText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  actionButtonsContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  actionButton: {
    marginBottom: 12,
    borderRadius: 8,
  },
  noteModalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 16,
  },
  noteModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  noteInput: {
    backgroundColor: '#f9f9f9',
    marginBottom: 16,
  },
  noteModalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});

export default ReportedIssuesScreen; 