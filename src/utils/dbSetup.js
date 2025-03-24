import { db } from '../firebase/config';
import { collection, doc, setDoc, getDoc } from 'firebase/firestore';

/**
 * Initialize the database collections for the app
 * This function checks if essential collections and documents exist and creates them if needed
 */
export const initializeDatabase = async () => {
  try {
    // Check if admin user exists
    const adminDocRef = doc(db, 'users', 'admin');
    const adminDoc = await getDoc(adminDocRef);
    
    // If admin doesn't exist, create one
    if (!adminDoc.exists()) {
      await setDoc(adminDocRef, {
        email: 'admin@edubro.com',
        fullName: 'Admin User',
        role: 'admin',
        createdAt: new Date().toISOString(),
      });
      console.log('Admin user created');
    }
    
    // Ensure subjects collection exists with some default subjects
    const subjects = [
      { id: 'mathematics', name: 'Mathematics', description: 'Math tutoring for all levels' },
      { id: 'physics', name: 'Physics', description: 'Physics for high school and college' },
      { id: 'chemistry', name: 'Chemistry', description: 'Chemistry tutoring' },
      { id: 'biology', name: 'Biology', description: 'Biology courses and topics' },
      { id: 'computer-science', name: 'Computer Science', description: 'Programming and computer science' },
      { id: 'english', name: 'English', description: 'English language and literature' },
      { id: 'history', name: 'History', description: 'World and local history' },
      { id: 'economics', name: 'Economics', description: 'Micro and macroeconomics' },
      { id: 'business', name: 'Business Studies', description: 'Business management and entrepreneurship' },
      { id: 'accounting', name: 'Accounting', description: 'Financial and management accounting' },
    ];
    
    // Add subjects to the database
    for (const subject of subjects) {
      const subjectDocRef = doc(db, 'subjects', subject.id);
      const subjectDoc = await getDoc(subjectDocRef);
      
      if (!subjectDoc.exists()) {
        await setDoc(subjectDocRef, subject);
        console.log(`Subject ${subject.name} created`);
      }
    }
    
    // Create tutorApplications collection (will be populated when students apply)
    // This just ensures the collection path is established
    const applicationSample = doc(db, 'tutorApplications', 'sample');
    const applicationDoc = await getDoc(applicationSample);
    
    if (!applicationDoc.exists()) {
      await setDoc(applicationSample, {
        sampleApplication: true,
        description: 'This is a sample application to establish the collection',
        createdAt: new Date().toISOString(),
      });
      console.log('Sample tutor application created');
    }
    
    // Set up sessions collection structure
    const sessionSample = doc(db, 'sessions', 'sample');
    const sessionDoc = await getDoc(sessionSample);
    
    if (!sessionDoc.exists()) {
      await setDoc(sessionSample, {
        sampleSession: true,
        tutorId: 'sample',
        studentId: 'sample',
        subject: 'mathematics',
        date: new Date().toISOString(),
        startTime: '10:00',
        endTime: '11:00',
        hours: 1,
        hourlyRate: 20,
        totalAmount: 20,
        status: 'completed', // pending, confirmed, completed, cancelled
        paymentStatus: 'paid', // pending, paid, refunded
        paymentId: 'sample',
        createdAt: new Date().toISOString(),
      });
      console.log('Sample session created');
    }
    
    // Set up availability slots collection
    const availabilitySample = doc(db, 'availability', 'sample');
    const availabilityDoc = await getDoc(availabilitySample);
    
    if (!availabilityDoc.exists()) {
      await setDoc(availabilitySample, {
        tutorId: 'sample',
        date: new Date().toISOString(),
        slots: [
          {
            startTime: '10:00',
            endTime: '11:00',
            isBooked: true,
            sessionId: 'sample'
          },
          {
            startTime: '14:00',
            endTime: '15:00',
            isBooked: false,
            sessionId: null
          }
        ],
        createdAt: new Date().toISOString(),
      });
      console.log('Sample availability slot created');
    }
    
    // Set up reviews collection
    const reviewSample = doc(db, 'reviews', 'sample');
    const reviewDoc = await getDoc(reviewSample);
    
    if (!reviewDoc.exists()) {
      await setDoc(reviewSample, {
        sessionId: 'sample',
        tutorId: 'sample',
        studentId: 'sample',
        rating: 4.5,
        comment: 'This is a sample review comment.',
        createdAt: new Date().toISOString(),
      });
      console.log('Sample review created');
    }
    
    console.log('Database initialization complete');
    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    return false;
  }
}; 