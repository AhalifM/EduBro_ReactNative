import { db } from '../firebase/config';
import { 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  collection, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  deleteDoc, 
  addDoc,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';

// Get all subjects from the database
export const getAllSubjects = async () => {
  try {
    const subjectsRef = collection(db, 'subjects');
    const snapshot = await getDocs(subjectsRef);
    const subjects = [];
    snapshot.forEach(doc => {
      subjects.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, subjects };
  } catch (error) {
    console.error("Error getting subjects:", error);
    return { success: false, error: error.message };
  }
};

// Add a subject to a tutor's profile
export const addSubjectToTutor = async (tutorId, subjectId) => {
  try {
    console.log(`Adding subject ${subjectId} to tutor ${tutorId}`);
    
    // First check if user document exists
    const tutorRef = doc(db, 'users', tutorId);
    const tutorDoc = await getDoc(tutorRef);
    
    if (!tutorDoc.exists()) {
      console.error(`Tutor document ${tutorId} does not exist`);
      return { success: false, error: "Tutor document not found" };
    }
    
    console.log('Current tutor data:', tutorDoc.data());
    
    // Update with the new subject
    await updateDoc(tutorRef, {
      subjects: arrayUnion(subjectId),
      updatedAt: new Date().toISOString()
    });
    
    // Verify the update
    const updatedDoc = await getDoc(tutorRef);
    const updatedData = updatedDoc.data();
    console.log('Updated tutor data:', updatedData);
    console.log('Updated subjects array:', updatedData.subjects);
    
    return { success: true };
  } catch (error) {
    console.error("Error adding subject to tutor:", error);
    return { success: false, error: error.message };
  }
};

// Remove a subject from a tutor's profile
export const removeSubjectFromTutor = async (tutorId, subjectId) => {
  try {
    const tutorRef = doc(db, 'users', tutorId);
    await updateDoc(tutorRef, {
      subjects: arrayRemove(subjectId),
      updatedAt: new Date().toISOString()
    });
    return { success: true };
  } catch (error) {
    console.error("Error removing subject from tutor:", error);
    return { success: false, error: error.message };
  }
};

// Update tutor's hourly rate
export const updateTutorHourlyRate = async (tutorId, hourlyRate) => {
  try {
    const tutorRef = doc(db, 'users', tutorId);
    await updateDoc(tutorRef, {
      hourlyRate,
      updatedAt: new Date().toISOString()
    });
    return { success: true };
  } catch (error) {
    console.error("Error updating tutor hourly rate:", error);
    return { success: false, error: error.message };
  }
};

// Add availability slot for a tutor
export const addAvailabilitySlot = async (tutorId, date, startTime, endTime) => {
  try {
    // Handle both string dates and Date objects
    let dateString;
    if (!date) {
      return { success: false, error: "Date is required" };
    }
    
    if (typeof date === 'string') {
      dateString = date;
    } else if (date instanceof Date) {
      dateString = date.toISOString().split('T')[0];
    } else {
      return { success: false, error: "Invalid date format" };
    }
    
    // Handle case where startTime is an array of times (for bulk adding)
    if (Array.isArray(startTime)) {
      // If it's an array with one time slot, use that
      if (startTime.length === 1) {
        const timeSlot = startTime[0];
        // Parse time to get next hour for endTime if not provided
        const hour = parseInt(timeSlot.split(':')[0]);
        startTime = timeSlot;
        endTime = endTime || `${(hour + 1).toString().padStart(2, '0')}:00`;
      } else {
        return { success: false, error: "Invalid time format" };
      }
    }
    
    // If we still don't have a valid startTime
    if (!startTime || typeof startTime !== 'string') {
      return { success: false, error: "Start time is required" };
    }
    
    // If endTime is not provided, assume it's 1 hour after startTime
    if (!endTime) {
      const hour = parseInt(startTime.split(':')[0]);
      endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;
    }
    
    console.log('Adding availability for:', { tutorId, dateString, startTime, endTime });
    
    const availabilityId = `${tutorId}_${dateString}`;
    
    // Check if document already exists for this date
    const availabilityRef = doc(db, 'availability', availabilityId);
    const availabilityDoc = await getDoc(availabilityRef);
    
    // Calculate slot duration in hours
    const startHour = parseInt(startTime.split(':')[0]);
    const endHour = parseInt(endTime.split(':')[0]);
    const duration = endHour - startHour;
    
    // Create slots based on duration (1 hour each)
    const newSlots = [];
    for (let i = 0; i < duration; i++) {
      const slotStartHour = startHour + i;
      const slotEndHour = slotStartHour + 1;
      const slotStartTime = `${slotStartHour.toString().padStart(2, '0')}:00`;
      const slotEndTime = `${slotEndHour.toString().padStart(2, '0')}:00`;
      
      newSlots.push({
        startTime: slotStartTime,
        endTime: slotEndTime,
        isBooked: false,
        sessionId: null
      });
    }
    
    if (availabilityDoc.exists()) {
      // Update existing document
      const existingSlots = availabilityDoc.data().slots || [];
      
      // Check for overlapping slots
      const existingStartTimes = existingSlots.map(slot => slot.startTime);
      const overlappingSlots = newSlots.filter(slot => 
        existingStartTimes.includes(slot.startTime)
      );
      
      if (overlappingSlots.length > 0) {
        return { 
          success: false, 
          error: "Some of these hours are already set as available." 
        };
      }
      
      // Add new slots
      await updateDoc(availabilityRef, {
        slots: [...existingSlots, ...newSlots],
        updatedAt: new Date().toISOString()
      });
    } else {
      // Create new document
      await setDoc(availabilityRef, {
        tutorId,
        date: dateString,
        slots: newSlots,
        createdAt: new Date().toISOString()
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error adding availability slot:", error);
    return { success: false, error: error.message };
  }
};

// Remove availability slot
export const removeAvailabilitySlot = async (tutorId, date, startTime, endTime) => {
  try {
    // Handle both string dates and Date objects
    let dateString;
    if (!date) {
      return { success: false, error: "Date is required" };
    }
    
    if (typeof date === 'string') {
      dateString = date;
    } else if (date instanceof Date) {
      dateString = date.toISOString().split('T')[0];
    } else {
      return { success: false, error: "Invalid date format" };
    }
    
    // If startTime is not provided or not a string
    if (!startTime || typeof startTime !== 'string') {
      return { success: false, error: "Start time is required" };
    }
    
    // If endTime is not provided, assume it's 1 hour after startTime
    if (!endTime) {
      const hour = parseInt(startTime.split(':')[0]);
      endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;
    }
    
    const availabilityId = `${tutorId}_${dateString}`;
    
    const availabilityRef = doc(db, 'availability', availabilityId);
    const availabilityDoc = await getDoc(availabilityRef);
    
    if (!availabilityDoc.exists()) {
      return { success: false, error: "No availability found for this date." };
    }
    
    const existingSlots = availabilityDoc.data().slots || [];
    
    // Find the specific slot to remove
    const slotToRemove = existingSlots.find(
      slot => slot.startTime === startTime && !slot.isBooked
    );
    
    if (!slotToRemove) {
      return { 
        success: false, 
        error: "Cannot find the slot or it is already booked by a student." 
      };
    }
    
    // Filter out the slot to remove
    const updatedSlots = existingSlots.filter(slot => 
      !(slot.startTime === startTime && !slot.isBooked)
    );
    
    if (updatedSlots.length === 0) {
      // If no slots left, delete the document
      await deleteDoc(availabilityRef);
    } else {
      // Update with remaining slots
      await updateDoc(availabilityRef, {
        slots: updatedSlots,
        updatedAt: new Date().toISOString()
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error removing availability slot:", error);
    return { success: false, error: error.message };
  }
};

// Get tutor availability for a specific date range
export const getTutorAvailability = async (tutorId, startDate, endDate) => {
  try {
    // Handle both string dates and Date objects
    const startDateString = typeof startDate === 'string' 
      ? startDate 
      : startDate.toISOString().split('T')[0];
      
    const endDateString = typeof endDate === 'string'
      ? endDate
      : endDate.toISOString().split('T')[0];
    
    console.log('Getting availability with dates:', { startDateString, endDateString });
    
    // Query availability documents within date range
    const availabilityRef = collection(db, 'availability');
    const q = query(
      availabilityRef,
      where('tutorId', '==', tutorId),
      where('date', '>=', startDateString),
      where('date', '<=', endDateString)
    );
    
    const snapshot = await getDocs(q);
    const availability = [];
    
    snapshot.forEach(doc => {
      availability.push({ id: doc.id, ...doc.data() });
    });
    
    return { success: true, availability };
  } catch (error) {
    console.error("Error getting tutor availability:", error);
    return { success: false, error: error.message };
  }
};

// Get all tutors with filters
export const getAllTutors = async (filters = {}) => {
  try {
    console.log('Getting all tutors with filters:', filters);
    
    let tutorsQuery = query(
      collection(db, 'users'),
      where('role', '==', 'tutor')
    );
    
    // Add subject filter if provided
    if (filters.subject) {
      tutorsQuery = query(
        tutorsQuery,
        where('subjects', 'array-contains', filters.subject)
      );
    }
    
    console.log('Executing tutors query');
    const snapshot = await getDocs(tutorsQuery);
    console.log('Found total tutors:', snapshot.size);
    
    let tutors = [];
    
    snapshot.forEach(doc => {
      const tutorData = doc.data();
      console.log('Tutor data for', doc.id, ':', tutorData);
      tutors.push({ uid: doc.id, ...tutorData });
    });
    
    // Filter tutors with non-empty subjects array
    const tutorsWithSubjects = tutors.filter(tutor => {
      const hasSubjects = tutor.subjects && Array.isArray(tutor.subjects) && tutor.subjects.length > 0;
      console.log('Tutor', tutor.uid, 'has subjects:', hasSubjects, tutor.subjects);
      return hasSubjects;
    });
    
    console.log(`Found ${tutorsWithSubjects.length} tutors with subjects out of ${tutors.length} total tutors`);
    
    return { success: true, tutors: tutorsWithSubjects };
  } catch (error) {
    console.error("Error getting tutors:", error);
    return { success: false, error: error.message };
  }
};

// Book a session with a tutor
export const bookSession = async (sessionData) => {
  try {
    const { 
      tutorId, 
      studentId, 
      date, 
      startTime, 
      endTime, 
      subject, 
      hourlyRate,
      tutorName,
      studentName,
      tutorPhoneNumber
    } = sessionData;
    
    // Format: 'YYYY-MM-DD' - handle both string and Date object
    const dateString = typeof date === 'string' ? date : date.toISOString().split('T')[0];
    const availabilityId = `${tutorId}_${dateString}`;
    
    // Get tutor availability
    const availabilityRef = doc(db, 'availability', availabilityId);
    const availabilityDoc = await getDoc(availabilityRef);
    
    if (!availabilityDoc.exists()) {
      return { success: false, error: "No availability found for this date." };
    }
    
    const existingSlots = availabilityDoc.data().slots || [];
    
    // Calculate slot duration in hours
    const startHour = parseInt(startTime.split(':')[0]);
    const endHour = parseInt(endTime.split(':')[0]);
    const duration = endHour - startHour;
    
    // Create an array of start times to book
    const startTimesToBook = [];
    for (let i = 0; i < duration; i++) {
      const slotStartHour = startHour + i;
      const slotStartTime = `${slotStartHour.toString().padStart(2, '0')}:00`;
      startTimesToBook.push(slotStartTime);
    }
    
    // Check if all slots are available
    const unavailableSlots = startTimesToBook.filter(time => {
      const slot = existingSlots.find(s => s.startTime === time);
      return !slot || slot.isBooked;
    });
    
    if (unavailableSlots.length > 0) {
      return { 
        success: false, 
        error: "Some of the requested time slots are not available." 
      };
    }
    
    // Calculate total amount
    const totalAmount = duration * hourlyRate;
    
    // Create a new session
    const sessionsRef = collection(db, 'sessions');
    const newSessionRef = await addDoc(sessionsRef, {
      tutorId,
      studentId,
      subject,
      date: dateString,
      startTime,
      endTime,
      hours: duration,
      hourlyRate,
      totalAmount,
      tutorName: tutorName || '',
      studentName: studentName || '',
      tutorPhoneNumber: tutorPhoneNumber || '',
      status: 'confirmed', // pending, confirmed, completed, cancelled
      paymentStatus: 'pending', // pending, paid, refunded
      paymentId: null,
      createdAt: new Date().toISOString()
    });
    
    const sessionId = newSessionRef.id;
    
    // Update availability slots to mark as booked
    const updatedSlots = existingSlots.map(slot => {
      if (startTimesToBook.includes(slot.startTime)) {
        return {
          ...slot,
          isBooked: true,
          sessionId
        };
      }
      return slot;
    });
    
    await updateDoc(availabilityRef, {
      slots: updatedSlots,
      updatedAt: new Date().toISOString()
    });
    
    return { success: true, sessionId };
  } catch (error) {
    console.error("Error booking session:", error);
    return { success: false, error: error.message };
  }
};

// Cancel a session (by student)
export const cancelSession = async (sessionId, userId) => {
  try {
    // Get session details
    const sessionRef = doc(db, 'sessions', sessionId);
    const sessionDoc = await getDoc(sessionRef);
    
    if (!sessionDoc.exists()) {
      return { success: false, error: "Session not found." };
    }
    
    const session = sessionDoc.data();
    
    // Verify that the user is the student who booked the session
    if (session.studentId !== userId) {
      return { success: false, error: "You don't have permission to cancel this session." };
    }
    
    // Check if the session is already cancelled or completed
    if (session.status === 'cancelled' || session.status === 'completed') {
      return { success: false, error: `Session is already ${session.status}.` };
    }
    
    // Check cancellation policy - must be at least 5 hours before session
    const sessionDate = new Date(`${session.date}T${session.startTime}:00`);
    const nowPlusFiveHours = new Date();
    nowPlusFiveHours.setHours(nowPlusFiveHours.getHours() + 5);
    
    if (sessionDate < nowPlusFiveHours) {
      return { 
        success: false, 
        error: "Cancellation failed. Sessions must be cancelled at least 5 hours in advance." 
      };
    }
    
    // Update session status
    await updateDoc(sessionRef, {
      status: 'cancelled',
      updatedAt: new Date().toISOString()
    });
    
    // Update availability to free up the slots
    const availabilityId = `${session.tutorId}_${session.date}`;
    const availabilityRef = doc(db, 'availability', availabilityId);
    const availabilityDoc = await getDoc(availabilityRef);
    
    if (availabilityDoc.exists()) {
      const slots = availabilityDoc.data().slots;
      
      // Update slots associated with this session
      const updatedSlots = slots.map(slot => {
        if (slot.sessionId === sessionId) {
          return {
            ...slot,
            isBooked: false,
            sessionId: null
          };
        }
        return slot;
      });
      
      await updateDoc(availabilityRef, {
        slots: updatedSlots,
        updatedAt: new Date().toISOString()
      });
    }
    
    // In a real app, you would also handle refunds through Stripe here
    
    return { success: true };
  } catch (error) {
    console.error("Error cancelling session:", error);
    return { success: false, error: error.message };
  }
};

// Get sessions for a user (student or tutor)
export const getUserSessions = async (userId, role, status = null) => {
  try {
    // Determine field to query based on role
    const roleField = role === 'tutor' ? 'tutorId' : 'studentId';
    
    // Create base query
    let sessionsQuery = query(
      collection(db, 'sessions'),
      where(roleField, '==', userId)
    );
    
    // Add status filter if provided
    if (status) {
      sessionsQuery = query(sessionsQuery, where('status', '==', status));
    }
    
    const snapshot = await getDocs(sessionsQuery);
    const sessions = [];
    
    snapshot.forEach(doc => {
      sessions.push({ id: doc.id, ...doc.data() });
    });
    
    return { success: true, sessions };
  } catch (error) {
    console.error("Error getting user sessions:", error);
    return { success: false, error: error.message };
  }
};

// Submit a review for a completed session
export const submitReview = async (sessionId, studentId, tutorId, rating, comment) => {
  try {
    // Verify the session exists and is completed
    const sessionRef = doc(db, 'sessions', sessionId);
    const sessionDoc = await getDoc(sessionRef);
    
    if (!sessionDoc.exists()) {
      return { success: false, error: "Session not found." };
    }
    
    const session = sessionDoc.data();
    
    if (session.status !== 'completed') {
      return { success: false, error: "Can only review completed sessions." };
    }
    
    if (session.studentId !== studentId) {
      return { success: false, error: "You can only review sessions you participated in." };
    }
    
    // Check if a review already exists
    const reviewsRef = collection(db, 'reviews');
    const reviewQuery = query(
      reviewsRef,
      where('sessionId', '==', sessionId),
      where('studentId', '==', studentId)
    );
    
    const reviewSnapshot = await getDocs(reviewQuery);
    
    if (!reviewSnapshot.empty) {
      return { success: false, error: "You have already reviewed this session." };
    }
    
    // Create the review
    await addDoc(reviewsRef, {
      sessionId,
      tutorId,
      studentId,
      rating,
      comment,
      createdAt: new Date().toISOString()
    });
    
    // Update tutor's rating
    const tutorRef = doc(db, 'users', tutorId);
    const tutorDoc = await getDoc(tutorRef);
    
    if (tutorDoc.exists()) {
      const tutorData = tutorDoc.data();
      const currentRating = tutorData.rating || 0;
      const totalReviews = tutorData.totalReviews || 0;
      
      // Calculate new average rating
      const newTotalReviews = totalReviews + 1;
      const newRating = ((currentRating * totalReviews) + rating) / newTotalReviews;
      
      await updateDoc(tutorRef, {
        rating: newRating,
        totalReviews: newTotalReviews,
        updatedAt: new Date().toISOString()
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error submitting review:", error);
    return { success: false, error: error.message };
  }
};

// Refresh user data from Firestore
export const refreshUserData = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      return { success: true, userData: { id: userDoc.id, ...userDoc.data() } };
    } else {
      return { success: false, error: "User not found" };
    }
  } catch (error) {
    console.error("Error refreshing user data:", error);
    return { success: false, error: error.message };
  }
}; 