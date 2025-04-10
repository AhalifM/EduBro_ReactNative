import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl,
  ScrollView
} from 'react-native';
import { Card, Avatar, Badge, useTheme, Searchbar, Chip, Button } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { getUserChats } from '../utils/chatUtils';
import { auth, db } from '../firebase/config';
import { MaterialIcons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { isValidImageUrl } from '../utils/auth';
import { doc, getDoc } from 'firebase/firestore';

const MessagesScreen = ({ navigation }) => {
  const [chats, setChats] = useState([]);
  const [filteredChats, setFilteredChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    subject: null,
    status: null,
  });
  const [activeTab, setActiveTab] = useState('ongoing'); // 'ongoing' or 'completed'
  const theme = useTheme();
  
  // Function to load chats
  const loadChats = useCallback(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setLoading(false);
      return;
    }
    
    const unsubscribe = getUserChats((chatsData) => {
      // Sort chats by most recent message
      const sortedChats = chatsData.sort((a, b) => {
        if (!a.lastMessageTime) return 1;
        if (!b.lastMessageTime) return -1;
        return b.lastMessageTime.toDate() - a.lastMessageTime.toDate();
      });
      
      setChats(sortedChats);
      setFilteredChats(sortedChats);
      setLoading(false);
      setRefreshing(false);
    });
    
    return unsubscribe;
  }, []);
  
  // Load chats when screen is focused
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      const unsubscribe = loadChats();
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }, [loadChats])
  );
  
  // Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadChats();
  }, [loadChats]);
  
  // Apply search, filters, and tab selection
  useEffect(() => {
    let result = [...chats];
    
    // Apply tab filter with date-based completion check
    const now = new Date();
    
    if (activeTab === 'ongoing') {
      result = result.filter(chat => {
        // Check if the session date/time has passed
        if (chat.sessionDetails?.date && chat.sessionDetails?.endTime) {
          const sessionDate = new Date(chat.sessionDetails.date);
          const [hours, minutes] = chat.sessionDetails.endTime.split(':').map(Number);
          sessionDate.setHours(hours, minutes, 0, 0);
          
          // If session end time has passed, consider it completed
          if (sessionDate < now) {
            return false;
          }
        }
        
        // Also filter out explicitly ended sessions
        return !chat.ended;
      });
    } else if (activeTab === 'completed') {
      result = result.filter(chat => {
        // Check if the session date/time has passed
        if (chat.sessionDetails?.date && chat.sessionDetails?.endTime) {
          const sessionDate = new Date(chat.sessionDetails.date);
          const [hours, minutes] = chat.sessionDetails.endTime.split(':').map(Number);
          sessionDate.setHours(hours, minutes, 0, 0);
          
          // If session end time has passed, consider it completed
          if (sessionDate < now) {
            return true;
          }
        }
        
        // Also include explicitly ended sessions
        return chat.ended;
      });
    }
    
    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(chat => {
        const isCurrentUserStudent = auth.currentUser.uid === chat.participants.studentId;
        const otherUserName = isCurrentUserStudent ? chat.participants.tutorName : chat.participants.studentName;
        const subject = chat.sessionDetails?.subject || '';
        const message = chat.lastMessage || '';
        
        return otherUserName.toLowerCase().includes(query) || 
               subject.toLowerCase().includes(query) ||
               message.toLowerCase().includes(query);
      });
    }
    
    // Apply subject filter
    if (activeFilters.subject) {
      result = result.filter(chat => 
        chat.sessionDetails?.subject === activeFilters.subject
      );
    }
    
    // Apply status filter
    if (activeFilters.status) {
      if (activeFilters.status === 'active') {
        result = result.filter(chat => !chat.ended);
      } else if (activeFilters.status === 'ended') {
        result = result.filter(chat => chat.ended);
      }
    }
    
    setFilteredChats(result);
  }, [chats, searchQuery, activeFilters, activeTab]);
  
  // Get unique subjects from chats
  const availableSubjects = useMemo(() => {
    const subjects = new Set();
    chats.forEach(chat => {
      if (chat.sessionDetails?.subject) {
        subjects.add(chat.sessionDetails.subject);
      }
    });
    return Array.from(subjects);
  }, [chats]);
  
  // Handle filter changes
  const toggleSubjectFilter = (subject) => {
    setActiveFilters(prev => ({
      ...prev,
      subject: prev.subject === subject ? null : subject
    }));
  };
  
  const toggleStatusFilter = (status) => {
    setActiveFilters(prev => ({
      ...prev,
      status: prev.status === status ? null : status
    }));
  };
  
  const clearFilters = () => {
    setActiveFilters({ subject: null, status: null });
    setSearchQuery('');
  };
  
  // Check if any filters are active
  const hasActiveFilters = activeFilters.subject || activeFilters.status || searchQuery;
  
  // Navigate to chat details
  const handleChatPress = (chat) => {
    const sessionDetails = chat.sessionDetails || {};
    // Ensure sessionId is available for navigation
    if (sessionDetails && !sessionDetails.id && chat.sessionId) {
      sessionDetails.id = chat.sessionId;
    }
    
    const isCurrentUserStudent = auth.currentUser.uid === chat.participants.studentId;
    const otherUserName = isCurrentUserStudent ? chat.participants.tutorName : chat.participants.studentName;
    const otherUserId = isCurrentUserStudent ? chat.participants.tutorId : chat.participants.studentId;
    
    // Make sure we have a valid name, not just "Student" or "Tutor"
    let displayName = otherUserName;
    if (!displayName || displayName === "Student" || displayName === "Tutor") {
      // Use first name + last initial or user ID as fallback
      displayName = chat.participants?.[isCurrentUserStudent ? 'tutorDisplayName' : 'studentDisplayName'] || 
                  (otherUserName || '').split(' ')[0] || 
                  `User ${otherUserId.substring(0, 5)}`;
    }
    
    navigation.navigate('ChatDetails', {
      chatId: chat.id,
      sessionDetails: sessionDetails,
      otherUserName: displayName,
      otherUserId: otherUserId
    });
  };
  
  // Format time
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    return formatDistanceToNow(timestamp.toDate(), { addSuffix: true });
  };
  
  // Render each chat item
  const renderChatItem = ({ item }) => {
    const isCurrentUserStudent = auth.currentUser.uid === item.participants.studentId;
    const otherUserName = isCurrentUserStudent ? item.participants.tutorName : item.participants.studentName;
    const otherUserId = isCurrentUserStudent ? item.participants.tutorId : item.participants.studentId;
    const otherUserPhoto = isCurrentUserStudent ? item.participants.tutorPhoto : item.participants.studentPhoto;
    const hasUnreadMessages = false; // This will be implemented when we track unread messages
    const isChatEnded = item.ended || false;
    
    // Make sure we have a valid name, not just "Student" or "Tutor"
    let displayName = otherUserName;
    if (!displayName || displayName === "Student" || displayName === "Tutor") {
      // Use first name + last initial or user ID as fallback
      displayName = item.participants?.[isCurrentUserStudent ? 'tutorDisplayName' : 'studentDisplayName'] || 
                   (otherUserName || '').split(' ')[0] || 
                   `User ${otherUserId.substring(0, 5)}`;
    }
    
    return (
      <TouchableOpacity onPress={() => handleChatPress(item)}>
        <Card style={styles.chatCard}>
          <View style={styles.chatContent}>
            <View style={styles.avatarContainer}>
              {otherUserPhoto && isValidImageUrl(otherUserPhoto) ? (
                <Avatar.Image 
                  size={65} 
                  source={{ uri: otherUserPhoto }} 
                  style={styles.userAvatar}
                />
              ) : (
                <Avatar.Text 
                  size={65} 
                  label={displayName.charAt(0).toUpperCase()} 
                  backgroundColor={theme.colors.primary} 
                  style={styles.userAvatar}
                />
              )}
            </View>
            <View style={styles.chatDetails}>
              <View style={styles.chatHeader}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <Text style={styles.userName}>{displayName}</Text>
                  {isChatEnded && (
                    <View style={styles.chatEndedBadge}>
                      <Text style={styles.chatEndedBadgeText}>Ended</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.timeAgo}>{formatTime(item.lastMessageTime)}</Text>
              </View>
              <View style={styles.messagePreview}>
                <Text 
                  style={[
                    styles.lastMessage, 
                    hasUnreadMessages && styles.unreadMessage
                  ]} 
                  numberOfLines={1}
                >
                  {item.lastMessage || 'No messages yet'}
                </Text>
                {hasUnreadMessages && (
                  <Badge style={styles.unreadBadge}>!</Badge>
                )}
              </View>
              <View style={styles.sessionInfo}>
                <MaterialIcons name="event" size={14} color={theme.colors.primary} />
                <Text style={styles.sessionDetails}>
                  {item.sessionDetails?.subject || 'N/A'} · {item.sessionDetails?.date || 'N/A'} · {item.sessionDetails?.startTime || 'N/A'}
                </Text>
              </View>
              {/* Show can delete info for students */}
              {isChatEnded && isCurrentUserStudent && (
                <Text style={styles.deleteInfo}>Tap to view or delete this chat</Text>
              )}
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };
  
  // Render empty state based on active tab
  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons 
        name={activeTab === 'ongoing' ? "chat-bubble-outline" : "history"} 
        size={64} 
        color="#CCCCCC" 
      />
      <Text style={styles.emptyText}>
        {activeTab === 'ongoing' ? 'No active chats' : 'No completed chats'}
      </Text>
      <Text style={styles.emptySubtext}>
        {activeTab === 'ongoing' 
          ? 'Chats will appear here once you have confirmed sessions'
          : 'Chats from completed sessions will appear here'
        }
      </Text>
    </View>
  );
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      {/* Search and filter section */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search messages"
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          iconColor={theme.colors.primary}
          inputStyle={styles.searchInput}
        />
        <TouchableOpacity 
          style={[styles.filterButton, filterVisible ? styles.filterButtonActive : null]} 
          onPress={() => setFilterVisible(!filterVisible)}
        >
          <MaterialIcons 
            name="filter-list" 
            size={24} 
            color={filterVisible ? theme.colors.primary : '#757575'} 
          />
          {hasActiveFilters && <View style={[styles.filterIndicator, { backgroundColor: theme.colors.primary }]} />}
        </TouchableOpacity>
      </View>
      
      {/* Session Type Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'ongoing' && styles.activeTabButton
          ]}
          onPress={() => setActiveTab('ongoing')}
        >
          <View style={styles.tabContent}>
            <MaterialIcons 
              name="forum" 
              size={22} 
              color={activeTab === 'ongoing' ? "#FFFFFF" : "#9C27B0"} 
            />
            <Text style={[
              styles.tabText,
              activeTab === 'ongoing' && styles.activeTabText
            ]}>Ongoing</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'completed' && styles.activeTabButton
          ]}
          onPress={() => setActiveTab('completed')}
        >
          <View style={styles.tabContent}>
            <MaterialIcons 
              name="history" 
              size={22} 
              color={activeTab === 'completed' ? "#FFFFFF" : "#9C27B0"} 
            />
            <Text style={[
              styles.tabText,
              activeTab === 'completed' && styles.activeTabText
            ]}>Completed</Text>
          </View>
        </TouchableOpacity>
      </View>
      
      {/* Filter options */}
      {filterVisible && (
        <View style={styles.filterContainer}>
          <Text style={styles.filterTitle}>Filter by Subject:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipContainer}>
            {availableSubjects.map(subject => (
              <Chip
                key={subject}
                selected={activeFilters.subject === subject}
                onPress={() => toggleSubjectFilter(subject)}
                style={styles.chip}
                selectedColor={theme.colors.primary}
                mode={activeFilters.subject === subject ? 'flat' : 'outlined'}
              >
                {subject}
              </Chip>
            ))}
          </ScrollView>
          
          <Text style={styles.filterTitle}>Filter by Status:</Text>
          <View style={styles.statusFilters}>
            <Chip
              selected={activeFilters.status === 'active'}
              onPress={() => toggleStatusFilter('active')}
              style={styles.chip}
              selectedColor={theme.colors.primary}
              mode={activeFilters.status === 'active' ? 'flat' : 'outlined'}
            >
              Active
            </Chip>
            <Chip
              selected={activeFilters.status === 'ended'}
              onPress={() => toggleStatusFilter('ended')}
              style={styles.chip}
              selectedColor={theme.colors.primary}
              mode={activeFilters.status === 'ended' ? 'flat' : 'outlined'}
            >
              Ended
            </Chip>
          </View>
          
          {hasActiveFilters && (
            <Button 
              mode="text" 
              onPress={clearFilters}
              style={styles.clearButton}
              color={theme.colors.primary}
            >
              Clear All Filters
            </Button>
          )}
        </View>
      )}
      
      <FlatList
        data={filteredChats}
        renderItem={renderChatItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={filteredChats.length === 0 ? styles.listEmpty : styles.list}
        ListEmptyComponent={renderEmptyComponent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
          />
        }
      />
    </View>
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
  chatCard: {
    marginHorizontal: 16,
    marginVertical: 10,
    padding: 16,
    elevation: 3,
    borderRadius: 12,
    shadowColor: 'rgba(0,0,0,0.2)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  chatContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(156, 39, 176, 0.08)',
    marginRight: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#9C27B0',
  },
  userAvatar: {
    width: 65,
    height: 65,
  },
  chatDetails: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userName: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  timeAgo: {
    fontSize: 12,
    color: '#888888',
  },
  messagePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  lastMessage: {
    flex: 1,
    fontSize: 14,
    color: '#555555',
  },
  unreadMessage: {
    fontWeight: 'bold',
    color: '#000000',
  },
  unreadBadge: {
    marginLeft: 8,
  },
  sessionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  sessionDetails: {
    fontSize: 12,
    color: '#888888',
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    color: '#555555',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    marginTop: 8,
  },
  list: {
    paddingVertical: 8,
  },
  listEmpty: {
    flex: 1,
    justifyContent: 'center',
  },
  chatEndedBadge: {
    backgroundColor: '#FF9800',
    borderRadius: 12,
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginLeft: 8,
  },
  chatEndedBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  deleteInfo: {
    fontSize: 12,
    color: '#888888',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    height: 60,
  },
  searchBar: {
    flex: 1,
    elevation: 0,
    backgroundColor: '#f5f5f5',
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 0,
    borderWidth: 0.5,
    borderColor: '#9C27B0',
  },
  searchInput: {
    fontSize: 14,
    height: 40,
    alignSelf: 'center',
    paddingVertical: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  filterButton: {
    marginLeft: 8,
    padding: 8,
    borderRadius: 20,
  },
  filterButtonActive: {
    backgroundColor: 'rgba(156, 39, 176, 0.1)',
  },
  filterIndicator: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#9C27B0',
  },
  filterContainer: {
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginVertical: 8,
    color: '#424242',
  },
  chipContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  chip: {
    marginRight: 8,
    marginBottom: 8,
  },
  statusFilters: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  clearButton: {
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 25,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  activeTabButton: {
    backgroundColor: '#9C27B0',
    borderColor: '#9C27B0',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9C27B0',
    marginLeft: 8,
  },
  activeTabText: {
    color: '#FFFFFF',
  },
});

export default MessagesScreen; 