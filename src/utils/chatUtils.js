import { db } from '../firebase/config';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  setDoc,
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  Timestamp,
  deleteDoc
} from 'firebase/firestore';
import { auth } from '../firebase/config';

// Create a new chat when a session is accepted
export const createChat = async (sessionId, sessionData) => {
  try {
    // Check if chat already exists
    const chatRef = doc(db, 'chats', sessionId);
    const chatDoc = await getDoc(chatRef);
    
    if (chatDoc.exists()) {
      return { success: true, chatId: sessionId };
    }
    
    // Get student and tutor data to include profile photos
    const studentRef = doc(db, 'users', sessionData.studentId);
    const tutorRef = doc(db, 'users', sessionData.tutorId);
    const studentDoc = await getDoc(studentRef);
    const tutorDoc = await getDoc(tutorRef);
    
    const studentData = studentDoc.exists() ? studentDoc.data() : {};
    const tutorData = tutorDoc.exists() ? tutorDoc.data() : {};
    
    // Create new chat document
    await setDoc(chatRef, {
      createdAt: serverTimestamp(),
      ended: false,
      sessionDetails: {
        subject: sessionData.subject,
        date: sessionData.date,
        startTime: sessionData.startTime,
        endTime: sessionData.endTime,
        status: sessionData.status
      },
      participants: {
        studentId: sessionData.studentId,
        studentName: sessionData.studentName,
        studentPhoto: studentData.photoURL || null,
        tutorId: sessionData.tutorId,
        tutorName: sessionData.tutorName,
        tutorPhoto: tutorData.photoURL || null
      },
      lastMessage: null,
      lastMessageTime: null,
      typing: {},
      deletedBy: {}
    });
    
    return { success: true, chatId: sessionId };
  } catch (error) {
    console.error("Error creating chat:", error);
    return { success: false, error: error.message };
  }
};

// Send a message in a chat
export const sendMessage = async (chatId, content) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return { success: false, error: "User not authenticated" };
    }
    
    // Get chat document to verify it exists and hasn't been ended
    const chatRef = doc(db, 'chats', chatId);
    const chatDoc = await getDoc(chatRef);
    
    if (!chatDoc.exists()) {
      return { success: false, error: "Chat not found" };
    }
    
    const chatData = chatDoc.data();
    
    // Check if chat has been ended
    if (chatData.ended) {
      return { success: false, error: "This chat has been ended by the tutor" };
    }
    
    // Determine sender type (student or tutor)
    const senderType = currentUser.uid === chatData.participants.studentId ? 'student' : 'tutor';
    const senderName = senderType === 'student' ? chatData.participants.studentName : chatData.participants.tutorName;
    
    // Add message to the chat
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const newMessage = {
      senderId: currentUser.uid,
      senderType,
      senderName,
      content,
      timestamp: serverTimestamp(),
      read: false
    };
    
    const messageDoc = await addDoc(messagesRef, newMessage);
    
    // Update the lastMessage and lastMessageTime in the chat document
    await updateDoc(chatRef, {
      lastMessage: content,
      lastMessageTime: serverTimestamp()
    });
    
    return { success: true, messageId: messageDoc.id };
  } catch (error) {
    console.error("Error sending message:", error);
    return { success: false, error: error.message };
  }
};

// Mark messages as read
export const markMessagesAsRead = async (chatId, otherUserId) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return { success: false, error: "User not authenticated" };
    }
    
    // Get all unread messages from the other user
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const unreadQuery = query(
      messagesRef,
      where('senderId', '==', otherUserId),
      where('read', '==', false)
    );
    
    const unreadDocs = await getDocs(unreadQuery);
    
    // Mark each message as read
    const batch = [];
    unreadDocs.forEach((messageDoc) => {
      const messageRef = doc(db, 'chats', chatId, 'messages', messageDoc.id);
      batch.push(updateDoc(messageRef, { read: true }));
    });
    
    if (batch.length > 0) {
      await Promise.all(batch);
    }
    
    return { success: true, count: batch.length };
  } catch (error) {
    console.error("Error marking messages as read:", error);
    return { success: false, error: error.message };
  }
};

// Get all active chats for the current user
export const getUserChats = (callback) => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    callback([]);
    return () => {};
  }
  
  const chatsRef = collection(db, 'chats');
  // Get all chats, not just those that haven't expired
  const userChatsQuery = query(chatsRef);
  
  return onSnapshot(userChatsQuery, (snapshot) => {
    const chats = [];
    snapshot.forEach((doc) => {
      const chatData = doc.data();
      // Check if current user is a participant
      if (
        (chatData.participants.studentId === currentUser.uid ||
        chatData.participants.tutorId === currentUser.uid) && 
        // Check if the user has deleted this chat
        (!chatData.deletedBy || !chatData.deletedBy[currentUser.uid])
      ) {
        chats.push({
          id: doc.id,
          ...chatData
        });
      }
    });
    callback(chats);
  });
};

// Get messages for a specific chat with real-time updates
export const getChatMessages = (chatId, callback) => {
  const messagesRef = collection(db, 'chats', chatId, 'messages');
  const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));
  
  return onSnapshot(messagesQuery, (snapshot) => {
    const messages = [];
    snapshot.forEach((doc) => {
      messages.push({
        id: doc.id,
        ...doc.data()
      });
    });
    callback(messages);
  });
};

// Update typing indicator
export const updateTypingStatus = async (chatId, isTyping) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return { success: false, error: "User not authenticated" };
    }
    
    const chatRef = doc(db, 'chats', chatId);
    const field = `typing.${currentUser.uid}`;
    
    await updateDoc(chatRef, {
      [field]: isTyping ? serverTimestamp() : null
    });
    
    return { success: true };
  } catch (error) {
    console.error("Error updating typing status:", error);
    return { success: false, error: error.message };
  }
};

// End a chat session (only tutors can end chats)
export const endChatSession = async (chatId) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return { success: false, error: "User not authenticated" };
    }
    
    // Get chat document to verify it exists
    const chatRef = doc(db, 'chats', chatId);
    const chatDoc = await getDoc(chatRef);
    
    if (!chatDoc.exists()) {
      return { success: false, error: "Chat not found" };
    }
    
    const chatData = chatDoc.data();
    
    // Verify that the current user is the tutor
    if (currentUser.uid !== chatData.participants.tutorId) {
      return { success: false, error: "Only tutors can end chat sessions" };
    }
    
    // Update the chat to set it as ended
    await updateDoc(chatRef, {
      ended: true,
      endedAt: serverTimestamp(),
      endedBy: currentUser.uid
    });
    
    return { success: true };
  } catch (error) {
    console.error("Error ending chat session:", error);
    return { success: false, error: error.message };
  }
};

// Delete a chat (can be done by either student or tutor)
export const deleteChat = async (chatId) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return { success: false, error: "User not authenticated" };
    }
    
    // Get chat document to verify it exists
    const chatRef = doc(db, 'chats', chatId);
    const chatDoc = await getDoc(chatRef);
    
    if (!chatDoc.exists()) {
      return { success: false, error: "Chat not found" };
    }
    
    const chatData = chatDoc.data();
    
    // Verify that the current user is a participant
    if (
      currentUser.uid !== chatData.participants.studentId && 
      currentUser.uid !== chatData.participants.tutorId
    ) {
      return { success: false, error: "You are not a participant in this chat" };
    }
    
    // Check if the current user is a student and the chat hasn't been ended
    if (
      currentUser.uid === chatData.participants.studentId && 
      !chatData.ended
    ) {
      return { 
        success: false, 
        error: "Students cannot delete a chat until the tutor has ended it" 
      };
    }
    
    // Update the chat to mark it as deleted for this user
    // We'll keep track of which users have deleted the chat
    const field = `deletedBy.${currentUser.uid}`;
    await updateDoc(chatRef, {
      [field]: serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error("Error deleting chat:", error);
    return { success: false, error: error.message };
  }
};

// Setup chat expiration - No longer used (replaced with manual ending by tutors)
/*
export const setupChatExpiration = async () => {
  try {
    const chatsRef = collection(db, 'chats');
    const expiredChatsQuery = query(
      chatsRef,
      where('expiresAt', '<', Timestamp.now())
    );
    
    const expiredDocs = await getDocs(expiredChatsQuery);
    
    // Delete each expired chat
    const batch = [];
    expiredDocs.forEach((chatDoc) => {
      const chatRef = doc(db, 'chats', chatDoc.id);
      batch.push(deleteDoc(chatRef));
    });
    
    if (batch.length > 0) {
      await Promise.all(batch);
      console.log(`Deleted ${batch.length} expired chats`);
    }
    
    return { success: true, count: batch.length };
  } catch (error) {
    console.error("Error cleaning up expired chats:", error);
    return { success: false, error: error.message };
  }
};
*/ 