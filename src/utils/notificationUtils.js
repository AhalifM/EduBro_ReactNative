import { db } from '../firebase/config';
import { collection, addDoc, query, where, orderBy, getDocs, getDoc, doc, updateDoc } from 'firebase/firestore';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

// Setup notification handler
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch (error) {
  console.log('Error setting up notification handler:', error);
}

// Register for push notifications
export const registerForPushNotifications = async (userId) => {
  try {
    // Get permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Permission for notifications was denied');
      return { success: false, error: 'Permission for notifications was denied' };
    }
    
    // Get push token - handle potential errors
    let token;
    try {
      const response = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });
      token = response.data;
      console.log('Expo push token:', token);
    } catch (error) {
      console.log('Error getting push token:', error);
      return { success: false, error: 'Could not get push token' };
    }
    
    // Store token in Firestore
    if (userId && token) {
      try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          pushToken: token,
          updatedAt: new Date().toISOString()
        });
      } catch (error) {
        console.log('Error storing push token:', error);
        // Continue even if storage fails
      }
    }
    
    // Configure Android channels
    if (Platform.OS === 'android') {
      try {
        Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      } catch (error) {
        console.log('Error setting up Android notification channel:', error);
      }
    }
    
    return { success: true, token };
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return { success: false, error: error.message };
  }
};

// Send notification when session status changes
export const sendSessionNotification = async (sessionId, status) => {
  try {
    // Get session details
    const sessionRef = doc(db, 'sessions', sessionId);
    const sessionDoc = await getDoc(sessionRef);
    
    if (!sessionDoc.exists()) {
      return { success: false, error: "Session not found." };
    }
    
    const session = sessionDoc.data();
    
    // Determine which user to notify and the message
    let userIdToNotify;
    let title;
    let body;
    
    switch (status) {
      case 'confirmed':
        // Notify student that session was confirmed by tutor
        userIdToNotify = session.studentId;
        title = 'Session Confirmed';
        body = `Your session with ${session.tutorName} on ${session.date} at ${session.startTime} has been confirmed.`;
        break;
        
      case 'cancelled':
        // Notify student that session was declined by tutor
        userIdToNotify = session.studentId;
        title = 'Session Cancelled';
        body = `Your session with ${session.tutorName} on ${session.date} at ${session.startTime} has been cancelled.`;
        break;
        
      case 'rescheduled':
        // Notify student that session was rescheduled by tutor
        userIdToNotify = session.studentId;
        title = 'Session Rescheduled';
        body = `${session.tutorName} has rescheduled your session. Please review the new time.`;
        break;
        
      case 'pending':
        // Notify tutor of new session request
        userIdToNotify = session.tutorId;
        title = 'New Session Request';
        body = `${session.studentName} has requested a session on ${session.date} at ${session.startTime}.`;
        break;
        
      default:
        return { success: false, error: "Invalid status for notification." };
    }
    
    // Store notification in Firestore for history
    await addDoc(collection(db, 'notifications'), {
      userId: userIdToNotify,
      title,
      body,
      data: { sessionId, status },
      read: false,
      createdAt: new Date().toISOString()
    });

    // Only attempt to send push notifications if we're not in Expo Go or if we have a token
    try {
      // Get user's push token
      const userRef = doc(db, 'users', userIdToNotify);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists() && userDoc.data().pushToken) {
        const pushToken = userDoc.data().pushToken;
        
        // Create notification message
        const message = {
          to: pushToken,
          sound: 'default',
          title: title,
          body: body,
          data: { sessionId, status, date: session.date, time: session.startTime },
        };
        
        // Send notification through Expo push service
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(message),
        });
        
        console.log('Push notification sent:', await response.text());
      } else {
        console.log('User does not have a push token registered');
      }
    } catch (error) {
      console.log('Error sending push notification:', error);
      // Continue even if push notification fails
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error sending notification:', error);
    return { success: false, error: error.message };
  }
};

// Create a notification for a user
export const createNotification = async (userId, title, message, type, relatedId = null) => {
  try {
    const notification = {
      userId,
      title,
      message,
      type, // 'session_booked', 'session_cancelled', 'payment_received', etc.
      relatedId, // ID of the related entity (session, payment, etc.)
      read: false,
      createdAt: new Date().toISOString()
    };
    
    await addDoc(collection(db, 'notifications'), notification);
    
    return { success: true };
  } catch (error) {
    console.error("Error creating notification:", error);
    return { success: false, error: error.message };
  }
};

// Get all notifications for a user
export const getUserNotifications = async (userId, limit = 50, onlyUnread = false) => {
  try {
    let notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    if (onlyUnread) {
      notificationsQuery = query(
        notificationsQuery,
        where('read', '==', false)
      );
    }
    
    const querySnapshot = await getDocs(notificationsQuery);
    
    const notifications = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return { 
      success: true, 
      notifications: notifications.slice(0, limit)
    };
  } catch (error) {
    console.error("Error getting notifications:", error);
    return { success: false, error: error.message };
  }
};

// Mark a notification as read
export const markNotificationAsRead = async (notificationId) => {
  try {
    const notificationRef = doc(db, 'notifications', notificationId);
    const notificationDoc = await getDoc(notificationRef);
    
    if (!notificationDoc.exists()) {
      return { success: false, error: "Notification not found." };
    }
    
    await updateDoc(notificationRef, {
      read: true
    });
    
    return { success: true };
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return { success: false, error: error.message };
  }
};

// Create session-related notifications
export const createSessionNotifications = async (session, action) => {
  try {
    const { tutorId, studentId, subject, date, startTime, endTime } = session;
    const formattedTime = `${startTime}-${endTime}`;
    
    let tutorNotification, studentNotification;
    
    switch (action) {
      case 'pending':
        tutorNotification = {
          userId: tutorId,
          title: 'New Session Request',
          message: `A student has requested a ${subject} session with you on ${date} at ${formattedTime}.`,
          type: 'session_pending',
          relatedId: session.id
        };
        
        studentNotification = {
          userId: studentId,
          title: 'Session Request Sent',
          message: `Your ${subject} session request for ${date} at ${formattedTime} has been sent to the tutor.`,
          type: 'session_pending',
          relatedId: session.id
        };
        break;
        
      case 'booked':
        tutorNotification = {
          userId: tutorId,
          title: 'New Session Booked',
          message: `A student has booked a ${subject} session with you on ${date} at ${formattedTime}.`,
          type: 'session_booked',
          relatedId: session.id
        };
        
        studentNotification = {
          userId: studentId,
          title: 'Session Booking Confirmed',
          message: `Your ${subject} session on ${date} at ${formattedTime} has been booked.`,
          type: 'session_booked',
          relatedId: session.id
        };
        break;
        
      case 'cancelled':
        tutorNotification = {
          userId: tutorId,
          title: 'Session Cancelled',
          message: `A ${subject} session on ${date} at ${formattedTime} has been cancelled.`,
          type: 'session_cancelled',
          relatedId: session.id
        };
        
        studentNotification = {
          userId: studentId,
          title: 'Session Cancelled',
          message: `Your ${subject} session on ${date} at ${formattedTime} has been cancelled.`,
          type: 'session_cancelled',
          relatedId: session.id
        };
        break;
        
      case 'completed':
        tutorNotification = {
          userId: tutorId,
          title: 'Session Completed',
          message: `Your ${subject} session on ${date} has been completed and payment has been released.`,
          type: 'session_completed',
          relatedId: session.id
        };
        
        studentNotification = {
          userId: studentId,
          title: 'Session Completed',
          message: `Your ${subject} session on ${date} has been marked as completed.`,
          type: 'session_completed',
          relatedId: session.id
        };
        break;
        
      default:
        return { success: false, error: "Invalid action type." };
    }
    
    // Create notifications for both users
    await Promise.all([
      createNotification(
        tutorNotification.userId,
        tutorNotification.title,
        tutorNotification.message,
        tutorNotification.type,
        tutorNotification.relatedId
      ),
      createNotification(
        studentNotification.userId,
        studentNotification.title,
        studentNotification.message,
        studentNotification.type,
        studentNotification.relatedId
      )
    ]);
    
    return { success: true };
  } catch (error) {
    console.error("Error creating session notifications:", error);
    return { success: false, error: error.message };
  }
}; 