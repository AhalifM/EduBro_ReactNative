import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, Alert, RefreshControl, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import { Text, Card, Button, Chip, Divider, Searchbar, IconButton, Menu, ActivityIndicator, Modal, Portal, Title, Badge, Avatar, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { db } from '../../firebase/config';
import { collection, query, orderBy, getDocs, doc, updateDoc, addDoc } from 'firebase/firestore';

const { width } = Dimensions.get('window');

const STATUS_COLORS = {
  pending: '#FF9800',    // Amber/Orange
  in_progress: '#2196F3', // Blue
  resolved: '#4CAF50',   // Green
  rejected: '#F44336',   // Red
};

const STATUS_ICONS = {
  pending: 'access-time',
  in_progress: 'hourglass-bottom',
  resolved: 'check-circle',
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
      medium: '#FF9800',
      high: '#F44336'
    };

    return (
      <TouchableOpacity onPress={() => showIssueDetails(item)} activeOpacity={0.7}>
        <Card style={styles.issueCard} mode="outlined">
          <View style={[styles.statusIndicator, { backgroundColor: STATUS_COLORS[item.status] }]} />
          <Card.Content>
            <View style={styles.issueHeader}>
              <View style={styles.titleSection}>
                <Text style={styles.issueTitle} numberOfLines={1}>{item.title}</Text>
                
                <View style={styles.issueMetaContainer}>
                  <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[item.status] }]} />
                  <Text style={styles.statusText}>
                    {item.status.replace('_', ' ')}
                  </Text>
                  
                  {urgencyLevel && (
                    <>
                      <View style={styles.metaSeparator} />
                      <Text style={[styles.urgencyText, { color: urgencyColors[urgencyLevel] }]}>
                        {urgencyLevel}
                      </Text>
                    </>
                  )}
                  
                  {item.hasAdminNotes && (
                    <>
                      <View style={styles.metaSeparator} />
                      <MaterialIcons name="comment" size={14} color="#6A1B9A" />
                    </>
                  )}
                </View>
              </View>
              
              <IconButton
                icon="dots-vertical"
                size={20}
                style={styles.menuButton}
                onPress={() => {
                  setSelectedIssue(item.id);
                  setMenuVisible(true);
                }}
              />
            </View>
            
            <Text style={styles.issueDescription} numberOfLines={2}>{item.description}</Text>
            
            <View style={styles.issueFooter}>
              <View style={styles.userInfo}>
                <Avatar.Text 
                  size={24} 
                  label={item.userName ? item.userName.substring(0, 1).toUpperCase() : 'U'} 
                  style={styles.avatar}
                  color="white"
                  backgroundColor={item.userRole === 'tutor' ? '#2196F3' : '#4CAF50'}
                />
                <Text style={styles.userName}>{item.userName}</Text>
              </View>
              
              <Text style={styles.dateText}>{formattedDate}</Text>
            </View>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderStatusBadges = () => (
    <View style={styles.statusBadgesContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statusBadgesScrollContent}
      >
        <TouchableOpacity 
          style={styles.statusCard} 
          onPress={() => onFilterChange('pending')}
          activeOpacity={0.8}
        >
          <View style={[styles.statusIconContainer, {backgroundColor: STATUS_COLORS.pending + '15'}]}>
            <MaterialIcons name={STATUS_ICONS.pending} size={22} color={STATUS_COLORS.pending} />
          </View>
          <Text style={styles.statusCount}>{issueStats.pending}</Text>
          <Text style={styles.statusLabel}>Pending</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.statusCard} 
          onPress={() => onFilterChange('in_progress')}
          activeOpacity={0.8}
        >
          <View style={[styles.statusIconContainer, {backgroundColor: STATUS_COLORS.in_progress + '15'}]}>
            <MaterialIcons name={STATUS_ICONS.in_progress} size={22} color={STATUS_COLORS.in_progress} />
          </View>
          <Text style={styles.statusCount}>{issueStats.in_progress}</Text>
          <Text style={styles.statusLabel}>In Progress</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.statusCard} 
          onPress={() => onFilterChange('resolved')}
          activeOpacity={0.8}
        >
          <View style={[styles.statusIconContainer, {backgroundColor: STATUS_COLORS.resolved + '15'}]}>
            <MaterialIcons name={STATUS_ICONS.resolved} size={22} color={STATUS_COLORS.resolved} />
          </View>
          <Text style={styles.statusCount}>{issueStats.resolved}</Text>
          <Text style={styles.statusLabel}>Resolved</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.statusCard} 
          onPress={() => onFilterChange('rejected')}
          activeOpacity={0.8}
        >
          <View style={[styles.statusIconContainer, {backgroundColor: STATUS_COLORS.rejected + '15'}]}>
            <MaterialIcons name={STATUS_ICONS.rejected} size={22} color={STATUS_COLORS.rejected} />
          </View>
          <Text style={styles.statusCount}>{issueStats.rejected}</Text>
          <Text style={styles.statusLabel}>Rejected</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const renderFilterButtons = () => (
    <View style={styles.filterContainer}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScrollContent}
      >
        <TouchableOpacity
          style={[
            styles.chipFilter,
            filterStatus === 'all' && styles.activeChipFilter
          ]}
          onPress={() => onFilterChange('all')}
        >
          <Text style={[
            styles.chipFilterText,
            filterStatus === 'all' && styles.activeChipFilterText
          ]}>All Issues</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.chipFilter,
            filterStatus === 'pending' && styles.activeChipFilter,
            filterStatus === 'pending' && {backgroundColor: STATUS_COLORS.pending + '20'}
          ]}
          onPress={() => onFilterChange('pending')}
        >
          <Text style={[
            styles.chipFilterText,
            filterStatus === 'pending' && {color: STATUS_COLORS.pending}
          ]}>Pending</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.chipFilter,
            filterStatus === 'in_progress' && styles.activeChipFilter,
            filterStatus === 'in_progress' && {backgroundColor: STATUS_COLORS.in_progress + '20'}
          ]}
          onPress={() => onFilterChange('in_progress')}
        >
          <Text style={[
            styles.chipFilterText,
            filterStatus === 'in_progress' && {color: STATUS_COLORS.in_progress}
          ]}>In Progress</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.chipFilter,
            filterStatus === 'resolved' && styles.activeChipFilter,
            filterStatus === 'resolved' && {backgroundColor: STATUS_COLORS.resolved + '20'}
          ]}
          onPress={() => onFilterChange('resolved')}
        >
          <Text style={[
            styles.chipFilterText,
            filterStatus === 'resolved' && {color: STATUS_COLORS.resolved}
          ]}>Resolved</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.chipFilter,
            filterStatus === 'rejected' && styles.activeChipFilter,
            filterStatus === 'rejected' && {backgroundColor: STATUS_COLORS.rejected + '20'}
          ]}
          onPress={() => onFilterChange('rejected')}
        >
          <Text style={[
            styles.chipFilterText,
            filterStatus === 'rejected' && {color: STATUS_COLORS.rejected}
          ]}>Rejected</Text>
        </TouchableOpacity>
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
        <ActivityIndicator size="large" color="#6A1B9A" />
        <Text style={styles.loadingText}>Loading issues...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reported Issues</Text>
        <Text style={styles.headerSubtitle}>Manage user-reported issues and respond to them</Text>
      </View>
      
      <View style={styles.contentContainer}>
        {renderStatusBadges()}
        
        <Searchbar
          placeholder="Search issues..."
          onChangeText={onChangeSearch}
          value={searchQuery}
          style={styles.searchBar}
          iconColor="#6A1B9A"
          paddingBottom={7}
        />
        
        {renderFilterButtons()}
        
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6A1B9A" />
            <Text style={styles.loadingText}>Loading issues...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredIssues}
            renderItem={renderIssueItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#6A1B9A"]} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialIcons name="inbox" size={64} color="#BDBDBD" />
                <Text style={styles.emptyTitle}>No issues found</Text>
                <Text style={styles.emptyText}>
                  {searchQuery ? 
                    'Try changing your search query' : 
                    filterStatus !== 'all' ? 
                      `No ${filterStatus.replace('_', ' ')} issues at the moment` :
                      'No reported issues yet'
                  }
                </Text>
                {(searchQuery || filterStatus !== 'all') && (
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={() => {
                      setSearchQuery('');
                      setFilterStatus('all');
                      applyFilters(issues, '', 'all');
                    }}
                  >
                    <Text style={styles.clearButtonText}>Clear Filters</Text>
                  </TouchableOpacity>
                )}
              </View>
            }
          />
        )}
      </View>
      
      <Menu
        visible={menuVisible}
        onDismiss={() => {
          setMenuVisible(false);
          setSelectedIssue(null);
        }}
        anchor={{ x: width - 40, y: 100 }}
        contentStyle={styles.menuContent}
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
        <Divider style={styles.menuDivider} />
        <Menu.Item 
          onPress={() => updateIssueStatus(selectedIssue, 'in_progress')} 
          title="Mark In Progress" 
          leadingIcon={STATUS_ICONS.in_progress}
          disabled={issues.find(issue => issue.id === selectedIssue)?.status === 'in_progress'}
        />
        <Menu.Item 
          onPress={() => updateIssueStatus(selectedIssue, 'resolved')} 
          title="Mark Resolved"
          leadingIcon={STATUS_ICONS.resolved}
          disabled={issues.find(issue => issue.id === selectedIssue)?.status === 'resolved'}
        />
        <Menu.Item 
          onPress={() => updateIssueStatus(selectedIssue, 'rejected')} 
          title="Reject Issue"
          leadingIcon={STATUS_ICONS.rejected}
          disabled={issues.find(issue => issue.id === selectedIssue)?.status === 'rejected'}
        />
        <Divider style={styles.menuDivider} />
        <Menu.Item 
          onPress={() => updateIssueStatus(selectedIssue, 'pending')} 
          title="Mark Pending"
          leadingIcon={STATUS_ICONS.pending}
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
    backgroundColor: '#F5F7FA',
  },
  header: {
    backgroundColor: '#6A1B9A',
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
    letterSpacing: 0.2,
  },
  contentContainer: {
    flex: 1,
    marginTop: -16,
  },
  statusBadgesContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  statusBadgesScrollContent: {
    paddingHorizontal: 1,
    alignItems: 'center',
  },
  statusCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 6,
    width: 100,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    height: 110,
  },
  statusIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statusCount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  statusLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  searchBar: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    elevation: 1,
    backgroundColor: 'white',
    height: 48,
  },
  filterContainer: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  filterScrollContent: {
    paddingBottom: 8,
    justifyContent: 'center',
  },
  chipFilter: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  activeChipFilter: {
    backgroundColor: '#EEEEEE',
  },
  chipFilterText: {
    fontSize: 13,
    color: '#616161',
    fontWeight: '500',
  },
  activeChipFilterText: {
    color: '#6A1B9A',
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 16,
    paddingTop: 0,
  },
  issueCard: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 0,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    position: 'relative',
  },
  statusIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 7,
    height: '100%',
  },
  issueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 15,
  },
  titleSection: {
    flex: 1,
    marginRight: 8,
  },
  issueTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  issueMetaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
  metaSeparator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 6,
  },
  urgencyText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  menuButton: {
    margin: 0,
    marginTop: -8,
    marginRight: -8,
  },
  issueDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  issueFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginRight: 8,
  },
  userName: {
    fontSize: 13,
    color: '#555',
  },
  dateText: {
    fontSize: 12,
    color: '#999',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 240,
  },
  clearButton: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
  },
  clearButtonText: {
    color: '#6A1B9A',
    fontWeight: '500',
    fontSize: 14,
  },
  menuContent: {
    borderRadius: 12,
    padding: 4,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginVertical: 4,
  },
  modalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 20,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  modalScrollView: {
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    
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
    borderRadius: 16,
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
    marginBottom: 12,
  },
  reporterDetailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
  },
  descriptionDetailText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  actionButtonsContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  actionButton: {
    marginBottom: 12,
    borderRadius: 8,
    elevation: 0,
  },
  noteModalContainer: {
    backgroundColor: 'white',
    padding: 24,
    margin: 20,
    borderRadius: 20,
    elevation: 8,
  },
  noteModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  noteInput: {
    backgroundColor: '#F9F9F9',
    marginBottom: 20,
    borderRadius: 8,
  },
  noteModalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});

export default ReportedIssuesScreen; 