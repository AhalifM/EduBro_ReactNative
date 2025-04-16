import {
  getAllTutors,
  getAllSubjects,
  bookSession,
  addAvailabilitySlot,
  submitReview
} from '../../utils/tutorUtils';

// Mock Firebase modules
jest.mock('../../firebase/config', () => {
  const db = {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    getDoc: jest.fn(),
    getDocs: jest.fn(),
    setDoc: jest.fn(),
    updateDoc: jest.fn(),
    where: jest.fn().mockReturnThis(),
    query: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis()
  };

  return { db };
});

// Import mock data
import { 
  mockUsers, 
  mockSubjects, 
  mockSessions, 
  mockReviews 
} from '../mocks/firebase';

describe('Tutor Utilities', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  // Test getting all tutors
  describe('Get All Tutors', () => {
    test('successfully retrieves all tutors', async () => {
      // Mock Firestore snapshot
      const mockSnapshot = {
        forEach: jest.fn(callback => {
          // Mock tutor data
          Object.values(mockUsers)
            .filter(user => user.role === 'tutor')
            .forEach(tutor => {
              callback({
                id: tutor.uid,
                data: () => tutor
              });
            });
        }),
        size: Object.values(mockUsers).filter(user => user.role === 'tutor').length
      };

      // Setup mock
      require('../../firebase/config').db.getDocs.mockResolvedValue(mockSnapshot);

      // Test the function
      const result = await getAllTutors();

      // Assertions
      expect(result.success).toBe(true);
      expect(result.tutors).toBeDefined();
      expect(result.tutors.length).toBeGreaterThan(0);
      expect(result.tutors[0].role).toBe('tutor');
    });

    test('handles error when retrieving tutors fails', async () => {
      // Mock Firestore error
      require('../../firebase/config').db.getDocs.mockRejectedValue(new Error('Database error'));

      // Test the function
      const result = await getAllTutors();

      // Assertions
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // Test getting all subjects
  describe('Get All Subjects', () => {
    test('successfully retrieves all subjects', async () => {
      // Mock Firestore snapshot
      const mockSnapshot = {
        forEach: jest.fn(callback => {
          // Mock subject data
          mockSubjects.forEach(subject => {
            callback({
              id: subject.id,
              data: () => subject
            });
          });
        }),
        size: mockSubjects.length
      };

      // Setup mock
      require('../../firebase/config').db.getDocs.mockResolvedValue(mockSnapshot);

      // Test the function
      const result = await getAllSubjects();

      // Assertions
      expect(result.success).toBe(true);
      expect(result.subjects).toBeDefined();
      expect(result.subjects.length).toBe(mockSubjects.length);
    });

    test('handles error when retrieving subjects fails', async () => {
      // Mock Firestore error
      require('../../firebase/config').db.getDocs.mockRejectedValue(new Error('Database error'));

      // Test the function
      const result = await getAllSubjects();

      // Assertions
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // Test booking a session
  describe('Book Session', () => {
    test('successfully books a session', async () => {
      // Mock successful document creation
      require('../../firebase/config').db.doc.mockReturnValue({
        id: 'newSession123'
      });
      require('../../firebase/config').db.setDoc.mockResolvedValue({});
      require('../../firebase/config').db.updateDoc.mockResolvedValue({});

      // Mock availability check
      require('../../firebase/config').db.getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          tutorId: 'tutor123',
          date: '2024-03-20',
          slots: [
            {
              startTime: '14:00',
              endTime: '15:00',
              isBooked: false
            }
          ]
        })
      });

      // Test booking data
      const bookingData = {
        tutorId: 'tutor123',
        studentId: 'student123',
        subject: 'mathematics',
        date: '2024-03-20',
        startTime: '14:00',
        endTime: '15:00',
        hourlyRate: 50
      };

      // Test the function
      const result = await bookSession(bookingData);

      // Assertions
      expect(result.success).toBe(true);
      expect(result.sessionId).toBeDefined();
    });

    test('fails when time slot is already booked', async () => {
      // Mock availability check - slot already booked
      require('../../firebase/config').db.getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          tutorId: 'tutor123',
          date: '2024-03-20',
          slots: [
            {
              startTime: '14:00',
              endTime: '15:00',
              isBooked: true,
              sessionId: 'existingSession123'
            }
          ]
        })
      });

      // Test booking data
      const bookingData = {
        tutorId: 'tutor123',
        studentId: 'student123',
        subject: 'mathematics',
        date: '2024-03-20',
        startTime: '14:00',
        endTime: '15:00',
        hourlyRate: 50
      };

      // Test the function
      const result = await bookSession(bookingData);

      // Assertions
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // Test adding availability slot
  describe('Add Availability Slot', () => {
    test('successfully adds a new availability slot', async () => {
      // Mock document check and update
      require('../../firebase/config').db.getDoc.mockResolvedValue({
        exists: () => false // Document doesn't exist yet
      });
      require('../../firebase/config').db.setDoc.mockResolvedValue({});

      // Test the function
      const result = await addAvailabilitySlot(
        'tutor123',
        '2024-03-25',
        '10:00',
        '11:00'
      );

      // Assertions
      expect(result.success).toBe(true);
    });

    test('successfully adds to existing availability', async () => {
      // Mock document exists with existing slots
      require('../../firebase/config').db.getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          tutorId: 'tutor123',
          date: '2024-03-25',
          slots: [
            {
              startTime: '14:00',
              endTime: '15:00',
              isBooked: false
            }
          ]
        })
      });
      require('../../firebase/config').db.updateDoc.mockResolvedValue({});

      // Test the function
      const result = await addAvailabilitySlot(
        'tutor123',
        '2024-03-25',
        '10:00',
        '11:00'
      );

      // Assertions
      expect(result.success).toBe(true);
    });

    test('fails when slot overlaps with existing slot', async () => {
      // Mock document exists with conflicting slot
      require('../../firebase/config').db.getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          tutorId: 'tutor123',
          date: '2024-03-25',
          slots: [
            {
              startTime: '10:30',
              endTime: '11:30',
              isBooked: false
            }
          ]
        })
      });

      // Test the function
      const result = await addAvailabilitySlot(
        'tutor123',
        '2024-03-25',
        '10:00',
        '11:00'
      );

      // Assertions
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // Test submitting a review
  describe('Submit Review', () => {
    test('successfully submits a review', async () => {
      // Mock session data
      require('../../firebase/config').db.getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          tutorId: 'tutor123',
          studentId: 'student123',
          status: 'completed'
        })
      });

      // Mock existing reviews check
      require('../../firebase/config').db.getDocs.mockResolvedValueOnce({
        empty: true,
        size: 0
      });

      // Mock document additions
      require('../../firebase/config').db.doc.mockReturnValue({
        id: 'newReview123'
      });
      require('../../firebase/config').db.setDoc.mockResolvedValue({});
      
      // Mock tutor data for rating update
      require('../../firebase/config').db.getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          ratingCount: 5,
          ratingSum: 20 // 4.0 average
        })
      });
      require('../../firebase/config').db.updateDoc.mockResolvedValue({});

      // Test the function
      const result = await submitReview(
        'session123',
        'student123',
        'tutor123',
        4.5,
        'Great tutor, very helpful!'
      );

      // Assertions
      expect(result.success).toBe(true);
    });

    test('fails when session does not exist', async () => {
      // Mock session not found
      require('../../firebase/config').db.getDoc.mockResolvedValue({
        exists: () => false
      });

      // Test the function
      const result = await submitReview(
        'nonexistentSession',
        'student123',
        'tutor123',
        4.5,
        'Great tutor!'
      );

      // Assertions
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('fails when review already exists', async () => {
      // Mock session data
      require('../../firebase/config').db.getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          tutorId: 'tutor123',
          studentId: 'student123',
          status: 'completed'
        })
      });

      // Mock existing review found
      require('../../firebase/config').db.getDocs.mockResolvedValueOnce({
        empty: false,
        size: 1
      });

      // Test the function
      const result = await submitReview(
        'session123',
        'student123',
        'tutor123',
        4.5,
        'Great tutor!'
      );

      // Assertions
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
}); 