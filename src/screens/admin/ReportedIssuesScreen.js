import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, Alert, RefreshControl, TouchableOpacity, Dimensions, ScrollView, StatusBar } from 'react-native';
import { Text, Card, Button, Chip, Divider, Searchbar, IconButton, Menu, ActivityIndicator, Modal, Portal, Title, Badge, Avatar, TextInput, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { db } from '../../firebase/config';
import { collection, query, orderBy, getDocs, doc, updateDoc, addDoc } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const THEME_COLOR = '#6200ee';
const THEME_COLOR_LIGHT = '#bb86fc';

const STATUS_COLORS = {
  pending: '#FF9800', // Orange - more vibrant than yellow
  in_progress: '#2196F3', // Blue
  resolved: '#4CAF50', // Green
  rejected: '#F44336', // Red
};

const STATUS_ICONS = {
  pending: 'timer-sand',
  in_progress: 'progress-clock',
  resolved: 'check-circle',
  rejected: 'close-circle',
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
    
    const urgencyIcons = {
      low: 'flag-outline',
      medium: 'flag-variant',
      high: 'flag'
    };

    return (
      <TouchableOpacity onPress={() => showIssueDetails(item)} activeOpacity={0.7}>
        <Surface style={styles.issueSurface}>
          <Card style={styles.card} mode="elevated">
            <View style={[styles.statusIndicator, { backgroundColor: STATUS_COLORS[item.status] }]} />
            <Card.Content>
              <View style={styles.headerRow}>
                <View style={styles.titleContainer}>
                  <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                  <View style={styles.chipContainer}>
                    <Chip 
                      mode="outlined" 
                      style={[styles.statusChip, { borderColor: STATUS_COLORS[item.status] }]}
                      textStyle={{ color: STATUS_COLORS[item.status], fontWeight: '600' }}
                    >
                      <MaterialCommunityIcons name={STATUS_ICONS[item.status]} size={14} color={STATUS_COLORS[item.status]} /> 
                      {item.status.replace('_', ' ')}
                    </Chip>
                    
                    {urgencyLevel && (
                      <Chip 
                        mode="outlined" 
                        style={[styles.urgencyChip, { borderColor: urgencyColors[urgencyLevel] }]}
                        textStyle={{ color: urgencyColors[urgencyLevel], fontWeight: '600' }}
                      >
                        <MaterialCommunityIcons name={urgencyIcons[urgencyLevel]} size={14} color={urgencyColors[urgencyLevel]} />
                        {` ${urgencyLevel.toUpperCase()}`}
                      </Chip>
                    )}
                    
                    {item.hasAdminNotes && (
                      <MaterialIcons name="comment" size={16} color={THEME_COLOR} style={styles.noteIcon} />
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
                  style={styles.menuButton}
                />
              </View>
              
              <Divider style={styles.divider} />
              
              <View style={styles.userInfoRow}>
                <Avatar.Text 
                  size={28} 
                  label={item.userName ? item.userName.substring(0, 1).toUpperCase() : 'U'} 
                  backgroundColor={item.userRole === 'tutor' ? '#2196F3' : '#4CAF50'}
                  style={styles.userAvatar}
                />
                <View style={styles.userInfoContainer}>
                  <Text style={styles.reporterInfo}>
                    {item.userName} 
                    <Text style={styles.roleTag}> • {item.userRole}</Text>
                  </Text>
                  <Text style={styles.dateInfo}>
                    <MaterialCommunityIcons name="clock-outline" size={12} color="#888" /> {formattedDate}
                  </Text>
                </View>
              </View>
              
              <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
              
              <View style={styles.cardFooter}>
                <Text style={styles.viewMoreText}>View details</Text>
                <MaterialCommunityIcons name="chevron-right" size={16} color={THEME_COLOR} />
              </View>
            </Card.Content>
          </Card>
        </Surface>
      </TouchableOpacity>
    );
  };

  const renderStatusBadges = () => (
    <Surface style={styles.statsCardContainer}>
      <View style={styles.statusBadgesContainer}>
        <View style={styles.statusBadge}>
          <Surface style={[styles.badgeSurface, {borderColor: STATUS_COLORS.pending}]}>
            <Text style={[styles.badgeNumber, {color: STATUS_COLORS.pending}]}>{issueStats.pending}</Text>
            <MaterialCommunityIcons name={STATUS_ICONS.pending} size={20} color={STATUS_COLORS.pending} />
          </Surface>
          <Text style={styles.badgeLabel}>Pending</Text>
        </View>
        
        <View style={styles.statusBadge}>
          <Surface style={[styles.badgeSurface, {borderColor: STATUS_COLORS.in_progress}]}>
            <Text style={[styles.badgeNumber, {color: STATUS_COLORS.in_progress}]}>{issueStats.in_progress}</Text>
            <MaterialCommunityIcons name={STATUS_ICONS.in_progress} size={20} color={STATUS_COLORS.in_progress} />
          </Surface>
          <Text style={styles.badgeLabel}>In Progress</Text>
        </View>
        
        <View style={styles.statusBadge}>
          <Surface style={[styles.badgeSurface, {borderColor: STATUS_COLORS.resolved}]}>
            <Text style={[styles.badgeNumber, {color: STATUS_COLORS.resolved}]}>{issueStats.resolved}</Text>
            <MaterialCommunityIcons name={STATUS_ICONS.resolved} size={20} color={STATUS_COLORS.resolved} />
          </Surface>
          <Text style={styles.badgeLabel}>Resolved</Text>
        </View>
        
        <View style={styles.statusBadge}>
          <Surface style={[styles.badgeSurface, {borderColor: STATUS_COLORS.rejected}]}>
            <Text style={[styles.badgeNumber, {color: STATUS_COLORS.rejected}]}>{issueStats.rejected}</Text>
            <MaterialCommunityIcons name={STATUS_ICONS.rejected} size={20} color={STATUS_COLORS.rejected} />
          </Surface>
          <Text style={styles.badgeLabel}>Rejected</Text>
        </View>
      </View>
    </Surface>
  );

  const renderFilterButtons = () => (
    <View style={styles.filterContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Button
          mode={filterStatus === 'all' ? 'contained' : 'outlined'}
          onPress={() => onFilterChange('all')}
          style={styles.filterButton}
          labelStyle={styles.filterButtonLabel}
          buttonColor={filterStatus === 'all' ? THEME_COLOR : 'transparent'}
          textColor={filterStatus === 'all' ? 'white' : THEME_COLOR}
        >
          All ({issueStats.total})
        </Button>
        <Button
          mode={filterStatus === 'pending' ? 'contained' : 'outlined'}
          onPress={() => onFilterChange('pending')}
          style={styles.filterButton}
          buttonColor={filterStatus === 'pending' ? STATUS_COLORS.pending : 'transparent'}
          textColor={filterStatus === 'pending' ? 'white' : STATUS_COLORS.pending}
        >
          Pending ({issueStats.pending})
        </Button>
        <Button
          mode={filterStatus === 'in_progress' ? 'contained' : 'outlined'}
          onPress={() => onFilterChange('in_progress')}
          style={styles.filterButton}
          buttonColor={filterStatus === 'in_progress' ? STATUS_COLORS.in_progress : 'transparent'}
          textColor={filterStatus === 'in_progress' ? 'white' : STATUS_COLORS.in_progress}
        >
          In Progress ({issueStats.in_progress})
        </Button>
        <Button
          mode={filterStatus === 'resolved' ? 'contained' : 'outlined'}
          onPress={() => onFilterChange('resolved')}
          style={styles.filterButton}
          buttonColor={filterStatus === 'resolved' ? STATUS_COLORS.resolved : 'transparent'}
          textColor={filterStatus === 'resolved' ? 'white' : STATUS_COLORS.resolved}
        >
          Resolved ({issueStats.resolved})
        </Button>
        <Button
          mode={filterStatus === 'rejected' ? 'contained' : 'outlined'}
          onPress={() => onFilterChange('rejected')}
          style={styles.filterButton}
          buttonColor={filterStatus === 'rejected' ? STATUS_COLORS.rejected : 'transparent'}
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
            <LinearGradient
              colors={[THEME_COLOR, THEME_COLOR_LIGHT]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.modalHeaderGradient}
            >
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleContainer}>
                  <Text style={styles.modalTitle}>{detailIssue.title}</Text>
                  <Chip 
                    mode="outlined" 
                    style={[styles.detailStatusChip, { borderColor: 'white' }]}
                    textStyle={{ color: 'white', fontWeight: 'bold' }}
                  >
                    <MaterialCommunityIcons name={STATUS_ICONS[detailIssue.status]} size={14} color="white" /> 
                    {detailIssue.status.replace('_', ' ')}
                  </Chip>
                </View>
                <IconButton
                  icon="close"
                  iconColor="white"
                  size={24}
                  onPress={() => setModalVisible(false)}
                />
              </View>
            </LinearGradient>
            
            <Surface style={styles.detailCardSurface}>
              <Card style={styles.modalCard}>
                <Card.Content>
                  <View style={styles.sectionTitleContainer}>
                    <MaterialCommunityIcons name="account-details" size={20} color={THEME_COLOR} />
                    <Text style={styles.sectionTitle}>Reporter Information</Text>
                  </View>
                  <View style={styles.reporterDetailRow}>
                    <MaterialCommunityIcons name="account" size={18} color="#666" />
                    <Text style={styles.reporterDetailText}>
                      {detailIssue.userName} 
                      <Text style={styles.detailRoleTag}> • {detailIssue.userRole}</Text>
                    </Text>
                  </View>
                  <View style={styles.reporterDetailRow}>
                    <MaterialCommunityIcons name="email-outline" size={18} color="#666" />
                    <Text style={styles.reporterDetailText}>
                      {detailIssue.userEmail}
                    </Text>
                  </View>
                  <View style={styles.reporterDetailRow}>
                    <MaterialCommunityIcons name="calendar-outline" size={18} color="#666" />
                    <Text style={styles.reporterDetailText}>
                      Reported on: {detailIssue.createdAt.toLocaleString()}
                    </Text>
                  </View>
                  {detailIssue.updatedAt && (
                    <View style={styles.reporterDetailRow}>
                      <MaterialCommunityIcons name="update" size={18} color="#666" />
                      <Text style={styles.reporterDetailText}>
                        Last updated: {detailIssue.updatedAt.toLocaleString()}
                      </Text>
                    </View>
                  )}
                </Card.Content>
              </Card>
            </Surface>
            
            <Surface style={styles.detailCardSurface}>
              <Card style={styles.modalCard}>
                <Card.Content>
                  <View style={styles.sectionTitleContainer}>
                    <MaterialCommunityIcons name="text-box-outline" size={20} color={THEME_COLOR} />
                    <Text style={styles.sectionTitle}>Issue Description</Text>
                  </View>
                  <Text style={styles.descriptionDetailText}>
                    {detailIssue.description}
                  </Text>
                </Card.Content>
              </Card>
            </Surface>
            
            <View style={styles.actionButtonsContainer}>
              <Surface style={styles.actionButtonsSurface}>
                <Button 
                  mode="contained"
                  icon={() => <MaterialCommunityIcons name={STATUS_ICONS.in_progress} size={18} color="white" />}
                  style={[styles.actionButton, {backgroundColor: STATUS_COLORS.in_progress}]}
                  disabled={detailIssue.status === 'in_progress'}
                  onPress={() => updateIssueStatus(detailIssue.id, 'in_progress')}
                >
                  Mark In Progress
                </Button>
                <Button 
                  mode="contained"
                  icon={() => <MaterialCommunityIcons name={STATUS_ICONS.resolved} size={18} color="white" />}
                  style={[styles.actionButton, {backgroundColor: STATUS_COLORS.resolved}]}
                  disabled={detailIssue.status === 'resolved'}
                  onPress={() => updateIssueStatus(detailIssue.id, 'resolved')}
                >
                  Mark Resolved
                </Button>
                <Button 
                  mode="contained"
                  icon={() => <MaterialCommunityIcons name={STATUS_ICONS.rejected} size={18} color="white" />}
                  style={[styles.actionButton, {backgroundColor: STATUS_COLORS.rejected}]}
                  disabled={detailIssue.status === 'rejected'}
                  onPress={() => updateIssueStatus(detailIssue.id, 'rejected')}
                >
                  Reject Issue
                </Button>
                <Button 
                  mode="contained"
                  icon="note-text-outline"
                  style={[styles.actionButton, {backgroundColor: THEME_COLOR}]}
                  onPress={() => setAddNoteVisible(true)}
                >
                  Add Admin Note
                </Button>
              </Surface>
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
            style={{backgroundColor: THEME_COLOR}}
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
        <ActivityIndicator size="large" color={THEME_COLOR} />
        <Text style={styles.loadingText}>Loading issues...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <StatusBar backgroundColor={THEME_COLOR} barStyle="light-content" />
      
      <LinearGradient
        colors={[THEME_COLOR, THEME_COLOR_LIGHT]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Reported Issues</Text>
          <Text style={styles.headerSubtitle}>
            Manage user-reported issues and respond to them
          </Text>
        </View>
      </LinearGradient>
      
      {renderStatusBadges()}
      
      <Surface style={styles.searchContainer}>
        <Searchbar
          placeholder="Search issues..."
          onChangeText={onChangeSearch}
          value={searchQuery}
          style={styles.searchBar}
          iconColor={THEME_COLOR}
          inputStyle={styles.searchInput}
          clearIcon="close-circle"
        />
      </Surface>
      
      {renderFilterButtons()}
      
      <FlatList
        data={filteredIssues}
        keyExtractor={item => item.id}
        renderItem={renderIssueItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME_COLOR]} />
        }
        ListEmptyComponent={
          <Surface style={styles.emptyContainer}>
            <MaterialCommunityIcons name="information-outline" size={64} color="#9E9E9E" />
            <Text style={styles.emptyText}>
              {searchQuery ? 
                'No issues found matching your search' : 
                filterStatus !== 'all' ? 
                  `No ${filterStatus.replace('_', ' ')} issues found` :
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
          </Surface>
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
        <Divider />
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
    backgroundColor: '#f8f9fa',
  },
  headerGradient: {
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 6,
  },
  header: {
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  statsCardContainer: {
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 16,
    padding: 10,
    backgroundColor: 'white',
    elevation: 4,
  },
  statusBadgesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  statusBadge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeSurface: {
    borderWidth: 2,
    borderRadius: 50,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    elevation: 2,
    marginBottom: 8,
  },
  badgeNumber: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  badgeLabel: {
    fontSize: 12,
    color: '#555',
    fontWeight: '500',
  },
  searchContainer: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 10,
    backgroundColor: 'white',
    elevation: 2,
  },
  searchBar: {
    elevation: 0,
    backgroundColor: 'white',
    borderRadius: 10,
  },
  searchInput: {
    fontSize: 14,
  },
  filterContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
    marginTop: 6,
  },
  filterButton: {
    marginHorizontal: 4,
    borderRadius: 25,
    paddingHorizontal: 4,
  },
  filterButtonLabel: {
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    padding: 24,
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'white',
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
    borderColor: THEME_COLOR,
    borderRadius: 25,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  issueSurface: {
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: 'white',
    elevation: 2,
    overflow: 'hidden',
  },
  card: {
    borderRadius: 12,
    elevation: 0,
    margin: 0,
    overflow: 'hidden',
  },
  statusIndicator: {
    height: '100%',
    width: 6,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingLeft: 12,
  },
  titleContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
  },
  menuButton: {
    marginTop: 20,
  },
  noteIcon: {
    margin: 6,
  },
  chipContainer: {
    flexDirection: 'row',
    marginTop: 8,
    alignItems: 'center',
  },
  statusChip: {
    height: 33,
    marginRight: 8,
  },
  urgencyChip: {
    height: 33,
  },
  divider: {
    marginVertical: 10,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  userAvatar: {
    marginRight: 10,
  },
  userInfoContainer: {
    flex: 1,
  },
  reporterInfo: {
    fontSize: 14,
    color: '#444',
    fontWeight: '500',
  },
  roleTag: {
    fontSize: 13,
    color: '#777',
    fontWeight: 'normal',
  },
  dateInfo: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 10,
  },
  viewMoreText: {
    fontSize: 13,
    color: THEME_COLOR,
    fontWeight: '500',
  },
  modalContainer: {
    backgroundColor: '#f8f9fa',
    margin: 16,
    borderRadius: 16,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  modalScrollView: {
    flexGrow: 1,
  },
  modalHeaderGradient: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
  },
  modalTitleContainer: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  detailStatusChip: {
    height: 28,
    borderWidth: 1,
  },
  detailCardSurface: {
    margin: 12,
    borderRadius: 12,
    backgroundColor: 'white',
    elevation: 1,
    overflow: 'hidden',
  },
  modalCard: {
    borderRadius: 12,
    elevation: 0,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#444',
    marginLeft: 8,
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
  detailRoleTag: {
    fontSize: 14,
    color: '#777',
    fontWeight: 'normal',
  },
  descriptionDetailText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  actionButtonsContainer: {
    margin: 12,
    marginBottom: 24,
  },
  actionButtonsSurface: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'white',
    elevation: 1,
  },
  actionButton: {
    marginBottom: 12,
    borderRadius: 8,
    elevation: 0,
  },
  noteModalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 16,
    elevation: 6,
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