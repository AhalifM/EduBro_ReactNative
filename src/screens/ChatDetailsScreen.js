import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  Alert
} from 'react-native';
import { Appbar, Badge, useTheme, Menu, Divider } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { 
  getChatMessages, 
  sendMessage, 
  markMessagesAsRead, 
  updateTypingStatus, 
  endChatSession, 
  deleteChat 
} from '../utils/chatUtils';
import { auth } from '../firebase/config';
import { format } from 'date-fns';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const ChatDetailsScreen = ({ route, navigation }) => {
  const { chatId, sessionDetails = {}, otherUserName, otherUserId } = route.params || {};
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [chatData, setChatData] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const flatListRef = useRef(null);
  const theme = useTheme() || { colors: { primary: '#9C27B0', secondary: '#E91E63', error: '#F44336' } };
  
  // Load chat data to check status
  const fetchChatData = useCallback(async () => {
    try {
      const chatRef = doc(db, 'chats', chatId);
      const chatSnap = await getDoc(chatRef);
      if (chatSnap.exists()) {
        setChatData(chatSnap.data());
      }
    } catch (error) {
      console.error('Error fetching chat data:', error);
    }
  }, [chatId]);
  
  // Load messages and set up real-time listener
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchChatData();
      
      const unsubscribe = getChatMessages(chatId, (messagesData) => {
        setMessages(messagesData);
        setLoading(false);
        
        // Mark messages as read
        markMessagesAsRead(chatId, otherUserId);
      });
      
      return () => {
        if (unsubscribe) unsubscribe();
        // Clear typing indicator when leaving screen
        updateTypingStatus(chatId, false);
      };
    }, [chatId, otherUserId, fetchChatData])
  );
  
  // Handle sending messages
  const handleSend = async () => {
    if (!text.trim()) return;
    
    // Check if chat is ended
    if (chatData?.ended) {
      Alert.alert(
        "Cannot Send Message",
        "This chat has been ended by the tutor.",
        [{ text: "OK" }]
      );
      setText('');
      return;
    }
    
    // Clear typing timeout and indicator
    if (typingTimeout) clearTimeout(typingTimeout);
    updateTypingStatus(chatId, false);
    
    const trimmedText = text.trim();
    setText('');
    setSending(true);
    
    try {
      await sendMessage(chatId, trimmedText);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };
  
  // Handle ending the chat (tutor only)
  const handleEndChat = async () => {
    Alert.alert(
      "End Chat Session",
      "Are you sure you want to end this chat session? Neither of you will be able to send messages after this, but you can still view the chat history.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "End Chat", 
          style: "destructive",
          onPress: async () => {
            try {
              const result = await endChatSession(chatId);
              if (result.success) {
                fetchChatData();
                Alert.alert(
                  "Chat Ended",
                  "The chat session has been ended successfully."
                );
              } else {
                Alert.alert("Error", result.error || "Failed to end chat session");
              }
            } catch (error) {
              console.error('Error ending chat:', error);
              Alert.alert("Error", "An unexpected error occurred");
            }
          } 
        }
      ]
    );
  };
  
  // Handle deleting the chat
  const handleDeleteChat = async () => {
    console.log('Handling delete chat. isTutor:', isTutor, 'isChatEnded:', isChatEnded);
    
    // Double-check if the current user is a tutor based on chatData
    const currentUserId = auth.currentUser?.uid;
    const isTutorBasedOnChatData = currentUserId === chatData?.participants?.tutorId;
    console.log('Is tutor based on chatData:', isTutorBasedOnChatData);
    
    // Allow deletion if user is either recognized as tutor or is the tutor in chatData
    if (!isTutor && !isTutorBasedOnChatData && !isChatEnded) {
      Alert.alert(
        "Cannot Delete Chat",
        "Students can only delete chats after they've been ended by the tutor.",
        [{ text: "OK" }]
      );
      return;
    }
    
    Alert.alert(
      "Delete Chat",
      "Are you sure you want to delete this chat? This will remove it from your message list, but not from the other person's.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              const result = await deleteChat(chatId);
              if (result.success) {
                navigation.goBack();
              } else {
                Alert.alert("Error", result.error || "Failed to delete chat");
              }
            } catch (error) {
              console.error('Error deleting chat:', error);
              Alert.alert("Error", "An unexpected error occurred");
            }
          } 
        }
      ]
    );
  };
  
  // Handle typing indicator
  const handleTextChange = (value) => {
    setText(value);
    
    // Don't update typing if chat is ended
    if (chatData?.ended) return;
    
    // Clear previous timeout
    if (typingTimeout) clearTimeout(typingTimeout);
    
    // Only update typing status if not already typing
    if (!typing) {
      updateTypingStatus(chatId, true);
      setTyping(true);
    }
    
    // Set timeout to clear typing indicator after 2 seconds of inactivity
    const timeout = setTimeout(() => {
      updateTypingStatus(chatId, false);
      setTyping(false);
    }, 2000);
    
    setTypingTimeout(timeout);
  };
  
  // Format message time
  const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    return format(timestamp.toDate(), 'h:mm a');
  };
  
  // Get session status color
  const getStatusColor = (status) => {
    if (!status) return theme.colors.secondary;
    
    switch (status) {
      case 'confirmed':
        return theme.colors.primary;
      case 'completed':
        return theme.colors.success || 'green';
      case 'cancelled':
        return theme.colors.error || 'red';
      default:
        return theme.colors.secondary;
    }
  };
  
  // Check if user is tutor and if chat is ended with more explicit declarations
  let isTutor = false;
  try {
    // Log the values to debug
    console.log('Current user ID:', auth.currentUser?.uid);
    console.log('Tutor ID in sessionDetails:', sessionDetails?.tutorId);
    console.log('Session details:', sessionDetails);
    
    // Fix the tutor detection logic
    if (auth.currentUser?.uid && sessionDetails?.tutorId) {
      isTutor = auth.currentUser.uid === sessionDetails.tutorId;
    } else if (chatData?.participants?.tutorId) {
      // Fallback to chatData if sessionDetails doesn't have tutorId
      isTutor = auth.currentUser.uid === chatData.participants.tutorId;
    }
    console.log('Is tutor?', isTutor);
  } catch (error) {
    console.error('Error determining tutor status:', error);
  }

  let isChatEnded = false;
  try {
    isChatEnded = !!chatData?.ended;
  } catch (error) {
    console.error('Error determining chat ended status:', error);
  }
  
  // Render message item
  const renderMessageItem = ({ item, index }) => {
    const isCurrentUser = item.senderId === auth.currentUser.uid;
    const showReadReceipt = isCurrentUser && 
      index === 0 &&
      item.read;
    
    return (
      <View style={[
        styles.messageContainer,
        isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage
      ]}>
        <View style={[
          styles.messageBubble,
          isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble
        ]}>
          <Text style={[
            styles.messageText,
            isCurrentUser ? styles.currentUserText : styles.otherUserText
          ]}>
            {item.content}
          </Text>
          <Text style={styles.messageTime}>
            {formatMessageTime(item.timestamp)}
          </Text>
        </View>
        {showReadReceipt && (
          <Text style={styles.readReceipt}>Read</Text>
        )}
      </View>
    );
  };
  
  // Handle menu visibility
  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);
  
  // Move styles into the component function at the beginning instead of here
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F8F9FA',
    },
    header: {
      backgroundColor: '#9C27B0',
      elevation: 4,
    },
    headerContent: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#FFFFFF',
    },
    sessionBadge: {
      marginTop: 2,
    },
    sessionStatus: {
      fontSize: 12,
      fontWeight: 'bold',
      color: '#FFFFFF',
    },
    sessionInfoBar: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      backgroundColor: '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: '#EEEEEE',
      elevation: 2,
    },
    sessionInfoText: {
      fontSize: 14,
      color: '#666666',
      marginLeft: 8,
      flex: 1,
    },
    chatEndedBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 10,
      backgroundColor: '#E91E63',
    },
    chatEndedText: {
      color: '#FFFFFF',
      fontWeight: 'bold',
      marginLeft: 8,
    },
    chatEndedSubtext: {
      color: '#FFFFFF',
      fontSize: 12,
      opacity: 0.9,
      marginLeft: 8,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    messagesList: {
      padding: 16,
      flexGrow: 1,
    },
    messageContainer: {
      marginVertical: 4,
      maxWidth: '80%',
    },
    currentUserMessage: {
      alignSelf: 'flex-end',
    },
    otherUserMessage: {
      alignSelf: 'flex-start',
    },
    messageBubble: {
      padding: 12,
      borderRadius: 18,
      elevation: 1,
    },
    currentUserBubble: {
      backgroundColor: '#E1BEE7',
      borderTopRightRadius: 4,
    },
    otherUserBubble: {
      backgroundColor: '#FFFFFF',
      borderTopLeftRadius: 4,
    },
    messageText: {
      fontSize: 16,
      lineHeight: 22,
    },
    currentUserText: {
      color: '#212121',
    },
    otherUserText: {
      color: '#424242',
    },
    messageTime: {
      fontSize: 11,
      color: '#9E9E9E',
      alignSelf: 'flex-end',
      marginTop: 4,
    },
    readReceipt: {
      fontSize: 10,
      color: '#9C27B0',
      alignSelf: 'flex-end',
      marginTop: 2,
    },
    typingContainer: {
      paddingHorizontal: 16,
      paddingVertical: 4,
    },
    typingText: {
      fontSize: 12,
      color: '#9E9E9E',
      fontStyle: 'italic',
    },
    inputContainer: {
      flexDirection: 'row',
      padding: 10,
      backgroundColor: '#FFFFFF',
      borderTopWidth: 1,
      borderTopColor: '#EEEEEE',
    },
    input: {
      flex: 1,
      backgroundColor: '#F1F1F1',
      borderRadius: 24,
      paddingHorizontal: 16,
      paddingVertical: 10,
      maxHeight: 100,
      fontSize: 16,
    },
    inputDisabled: {
      backgroundColor: '#F5F5F5',
      color: '#9E9E9E',
    },
    sendButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: '#9C27B0',
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 8,
      elevation: 2,
    },
    sendButtonDisabled: {
      backgroundColor: '#D1C4E9',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: 'bold',
      marginTop: 16,
      color: '#757575',
    },
    emptySubtext: {
      fontSize: 14,
      color: '#9E9E9E',
      textAlign: 'center',
      marginTop: 8,
    },
  });
  
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : null}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction color="#fff" onPress={() => navigation.goBack()} />
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{otherUserName}</Text>
          <View style={styles.sessionBadge}>
            <Text style={[
              styles.sessionStatus,
              { color: getStatusColor(sessionDetails?.status) }
            ]}>
              {sessionDetails?.status 
                ? sessionDetails.status.charAt(0).toUpperCase() + sessionDetails.status.slice(1) 
                : 'Unknown'}
            </Text>
          </View>
        </View>
        
        {/* Directly check if user is the tutor in chat data */}
        {auth.currentUser?.uid === chatData?.participants?.tutorId && (
          <>
            {!isChatEnded && (
              <Appbar.Action 
                icon="stop-circle" 
                color="#fff" 
                onPress={handleEndChat} 
              />
            )}
            <Appbar.Action 
              icon="delete" 
              color="#fff" 
              onPress={handleDeleteChat} 
            />
          </>
        )}
        
        {/* For students */}
        {auth.currentUser?.uid === chatData?.participants?.studentId && (
          <>
            {isChatEnded ? (
              <Appbar.Action 
                icon="delete" 
                color="#fff" 
                onPress={handleDeleteChat} 
              />
            ) : (
              <View style={{opacity: 0.5}}>
                <Appbar.Action 
                  icon="delete" 
                  color="#fff" 
                  onPress={() => Alert.alert(
                    "Cannot Delete Chat",
                    "Students can only delete chats after they've been ended by the tutor."
                  )} 
                />
              </View>
            )}
          </>
        )}
        
        <Menu
          visible={menuVisible}
          onDismiss={closeMenu}
          anchor={
            <Appbar.Action color="#fff" icon="dots-vertical" onPress={openMenu} />
          }
        >
          <Menu.Item 
            title="View Session Details" 
            leadingIcon="event"
            onPress={() => {
              closeMenu();
              // Navigation to SessionDetails
              const sessionId = sessionDetails?.id;
              if (sessionId) {
                // Check if we're in student or tutor navigation
                const isTutorApp = !!sessionDetails?.tutorId && sessionDetails.tutorId === auth.currentUser?.uid;
                
                if (isTutorApp) {
                  navigation.navigate('Schedule', {
                    screen: 'SessionDetails',
                    params: { sessionId }
                  });
                } else {
                  navigation.navigate('SessionsTab', {
                    screen: 'SessionDetails',
                    params: { sessionId }
                  });
                }
              } else {
                Alert.alert("Session Info", "Session details are not available or the session doesn't exist anymore.");
              }
            }} 
          />
        </Menu>
      </Appbar.Header>
      
      <View style={styles.sessionInfoBar}>
        <MaterialIcons name="event" size={16} color={theme?.colors?.primary || '#9C27B0'} />
        <Text style={styles.sessionInfoText}>
          {sessionDetails?.subject || 'N/A'} · {sessionDetails?.date || 'N/A'} · {sessionDetails?.startTime || 'N/A'}-{sessionDetails?.endTime || 'N/A'}
        </Text>
      </View>
      
      {isChatEnded && (
        <View style={styles.chatEndedBanner}>
          <MaterialIcons name="info" size={20} color="#FFFFFF" />
          <View style={{flex: 1}}>
            <Text style={styles.chatEndedText}>
              This chat has been ended by the tutor
            </Text>
            <Text style={styles.chatEndedSubtext}>
              {(() => {
                const currentUserId = auth.currentUser?.uid;
                const isTutorFromSessionDetails = currentUserId === sessionDetails?.tutorId;
                const isTutorFromChatData = currentUserId === chatData?.participants?.tutorId;
                const isCurrentUserTutor = isTutorFromSessionDetails || isTutorFromChatData;
                
                return isCurrentUserTutor
                  ? "You can still view and delete this chat" 
                  : "You can now delete this chat or continue to view it";
              })()}
            </Text>
          </View>
        </View>
      )}
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme?.colors?.primary || '#9C27B0'} />
        </View>
      ) : (
        <>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessageItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            inverted={false}
            onContentSizeChange={() => {
              if (flatListRef.current && messages.length > 0) {
                flatListRef.current.scrollToEnd({ animated: true });
              }
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialIcons name="chat-bubble-outline" size={64} color="#CCCCCC" />
                <Text style={styles.emptyText}>No messages yet</Text>
                <Text style={styles.emptySubtext}>
                  Start the conversation by sending a message
                </Text>
              </View>
            }
          />
          
          {typing && !isChatEnded && (
            <View style={styles.typingContainer}>
              <Text style={styles.typingText}>{otherUserName} is typing...</Text>
            </View>
          )}
          
          <View style={styles.inputContainer}>
            <TextInput
              style={[
                styles.input,
                isChatEnded && styles.inputDisabled
              ]}
              value={text}
              onChangeText={handleTextChange}
              placeholder={isChatEnded ? "Chat has ended" : "Type a message..."}
              multiline
              maxLength={500}
              onSubmitEditing={Keyboard.dismiss}
              editable={!sending && !isChatEnded}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!text.trim() || sending || isChatEnded) && styles.sendButtonDisabled
              ]}
              onPress={handleSend}
              disabled={!text.trim() || sending || isChatEnded}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <MaterialIcons name="send" size={24} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
};

export default ChatDetailsScreen; 