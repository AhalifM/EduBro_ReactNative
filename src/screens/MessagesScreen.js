import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl 
} from 'react-native';
import { Card, Avatar, Badge, useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { getUserChats } from '../utils/chatUtils';
import { auth } from '../firebase/config';
import { MaterialIcons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';

const MessagesScreen = ({ navigation }) => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
  
  // Navigate to chat details
  const handleChatPress = (chat) => {
    navigation.navigate('ChatDetails', {
      chatId: chat.id,
      sessionDetails: chat.sessionDetails,
      otherUserName: auth.currentUser.uid === chat.participants.studentId 
        ? chat.participants.tutorName 
        : chat.participants.studentName,
      otherUserId: auth.currentUser.uid === chat.participants.studentId 
        ? chat.participants.tutorId 
        : chat.participants.studentId
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
    const hasUnreadMessages = false; // This will be implemented when we track unread messages
    const isChatEnded = item.ended || false;
    
    return (
      <TouchableOpacity onPress={() => handleChatPress(item)}>
        <Card style={styles.chatCard}>
          <View style={styles.chatContent}>
            <Avatar.Text 
              size={50} 
              label={otherUserName.charAt(0).toUpperCase()} 
              backgroundColor={theme.colors.primary} 
            />
            <View style={styles.chatDetails}>
              <View style={styles.chatHeader}>
                <Text style={styles.userName}>{otherUserName}</Text>
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
                  {isChatEnded && <Text style={styles.chatEndedTag}>[Ended] </Text>}
                  {item.lastMessage || 'No messages yet'}
                </Text>
                {hasUnreadMessages && (
                  <Badge style={styles.unreadBadge}>!</Badge>
                )}
              </View>
              <View style={styles.sessionInfo}>
                <MaterialIcons name="event" size={14} color={theme.colors.primary} />
                <Text style={styles.sessionDetails}>
                  {item.sessionDetails.subject} · {item.sessionDetails.date} · {item.sessionDetails.startTime}
                </Text>
              </View>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };
  
  // Show empty state
  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="chat-bubble-outline" size={64} color="#CCCCCC" />
      <Text style={styles.emptyText}>No active chats</Text>
      <Text style={styles.emptySubtext}>
        Chats will appear here once you have confirmed sessions
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
      <FlatList
        data={chats}
        renderItem={renderChatItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={chats.length === 0 ? styles.listEmpty : styles.list}
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
    marginVertical: 8,
    padding: 12,
  },
  chatContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatDetails: {
    flex: 1,
    marginLeft: 12,
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
  chatEndedTag: {
    color: '#FF9800',
    fontWeight: 'bold',
  },
});

export default MessagesScreen; 