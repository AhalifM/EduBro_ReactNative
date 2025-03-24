import { db } from '../firebase/config';
import { collection, addDoc, query, where, orderBy, getDocs, getDoc, doc, updateDoc } from 'firebase/firestore';

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