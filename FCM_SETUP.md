# Setting Up Firebase Cloud Messaging (FCM) for EduBro

This guide explains how to set up Firebase Cloud Messaging (FCM) for push notifications in the EduBro app.

## Prerequisites

1. Firebase project already set up (which you have)
2. React Native app with Firebase integration (which you have)

## Step 1: Install Required Dependencies

```bash
# Install required dependencies
npm install @react-native-firebase/app @react-native-firebase/messaging expo-build-properties --save
```

## Step 2: Generate Firebase Configuration Files

1. Go to your [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Add apps for both iOS and Android if you haven't already

### For Android:

1. Click "Add app" > Android
2. Enter package name: `com.edubro.tutoring` (as specified in app.json)
3. Register app and download the `google-services.json` file
4. Place the file in the root of your EduBro project

### For iOS:

1. Click "Add app" > iOS
2. Enter bundle ID: `com.edubro.tutoring` (as specified in app.json)
3. Register app and download the `GoogleService-Info.plist` file
4. Place the file in the root of your EduBro project

## Step 3: Create a Development Build

Since FCM doesn't work in Expo Go, you need to create a development build:

```bash
# Install EAS CLI if you haven't already
npm install -g eas-cli

# Login to your Expo account
eas login

# Configure your project
eas build:configure

# Create a development build
eas build --profile development --platform all
```

## Step 4: Test Notifications

1. Send a test notification from the Firebase Console:
   - Go to Firebase Console > Your Project > Messaging
   - Create a new campaign
   - Select "Test on device"
   - Enter your device's FCM token (logged in the console when you register)
   - Send the test message

## Cloud Functions for Notifications

For production use, you should set up Firebase Cloud Functions to send notifications. Here's a sample cloud function:

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.sendNotificationOnSessionUpdate = functions.firestore
  .document('sessions/{sessionId}')
  .onUpdate(async (change, context) => {
    const newValue = change.after.data();
    const previousValue = change.before.data();
    
    // Only send notification if status changed
    if (newValue.status === previousValue.status) {
      return null;
    }
    
    const sessionId = context.params.sessionId;
    let userIdToNotify;
    let title;
    let body;
    
    switch (newValue.status) {
      case 'confirmed':
        userIdToNotify = newValue.studentId;
        title = 'Session Confirmed';
        body = `Your session on ${newValue.date} at ${newValue.startTime} has been confirmed.`;
        break;
      case 'cancelled':
        userIdToNotify = newValue.studentId;
        title = 'Session Cancelled';
        body = `Your session on ${newValue.date} at ${newValue.startTime} has been cancelled.`;
        break;
      case 'rescheduled':
        userIdToNotify = newValue.studentId;
        title = 'Session Rescheduled';
        body = `Your session has been rescheduled. Please check the new time.`;
        break;
      default:
        return null;
    }
    
    // Get user's FCM token
    const userSnapshot = await admin.firestore().collection('users').doc(userIdToNotify).get();
    if (!userSnapshot.exists || !userSnapshot.data().fcmToken) {
      console.log('No FCM token found for user:', userIdToNotify);
      return null;
    }
    
    const fcmToken = userSnapshot.data().fcmToken;
    
    // Send notification
    const message = {
      token: fcmToken,
      notification: {
        title,
        body,
      },
      data: {
        sessionId,
        status: newValue.status,
        date: newValue.date,
        time: newValue.startTime,
      },
    };
    
    try {
      const response = await admin.messaging().send(message);
      console.log('Notification sent:', response);
      return response;
    } catch (error) {
      console.error('Error sending notification:', error);
      return null;
    }
  });
```

## Additional Resources

- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)
- [React Native Firebase Messaging](https://rnfirebase.io/messaging/usage)
- [Firebase Cloud Functions](https://firebase.google.com/docs/functions) 