# EduBro - Peer Tutoring Mobile App

EduBro is a mobile application that connects students with peer tutors. The platform allows students to find tutors for various subjects, and also lets students apply to become tutors themselves.

## Features

- User authentication (login, register)
- Multiple roles (student, tutor, admin)
- Profile management
- Tutor application system
- Role-based navigation and access control

## Technology Stack

- React Native
- Expo
- Firebase Authentication
- Firestore Database
- React Navigation
- React Native Paper (UI components)

## Setup Instructions

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a Firebase project and configure it:
   - Enable Authentication (Email/Password)
   - Create a Firestore database
   - Update the Firebase config in `src/firebase/config.js`
4. Start the application:
   - iOS: `npm run ios`
   - Android: `npm run android`
   - Web: `npm run web`

## Project Structure

```
src/
├── components/       # Reusable UI components
├── firebase/         # Firebase configuration
├── navigation/       # Navigation configurations
├── screens/          # Application screens
│   ├── admin/        # Admin-specific screens
│   ├── auth/         # Authentication screens
│   ├── student/      # Student-specific screens
│   └── tutor/        # Tutor-specific screens
└── utils/            # Utility functions
```

## Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Add a web app to your project
4. Copy the firebase config to `src/firebase/config.js`
5. Set up Authentication (Email/Password)
6. Set up Firestore Database
7. Set up security rules for your database

## Development

To add new features or fix bugs:

1. Create a new branch
2. Make your changes
3. Test your changes
4. Create a pull request

## License

This project is licensed under the MIT License. 