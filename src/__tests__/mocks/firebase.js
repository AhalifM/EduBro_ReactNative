// Mock Firebase services for testing
const mockFirebaseAuth = {
  currentUser: null,
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  sendPasswordResetEmail: jest.fn()
};

const mockFirestore = {
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  updateDoc: jest.fn(),
  setDoc: jest.fn(),
  deleteDoc: jest.fn(),
  where: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn()
};

const mockStorage = {
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn()
};

// Mock user data for tests
const mockUsers = {
  'student123': {
    uid: 'student123',
    email: 'student@example.com',
    fullName: 'Student User',
    role: 'student',
    createdAt: '2023-01-01T00:00:00.000Z'
  },
  'tutor123': {
    uid: 'tutor123',
    email: 'tutor@example.com',
    fullName: 'Tutor User',
    role: 'tutor',
    subjects: ['mathematics', 'physics'],
    gpa: '3.75',
    hourlyRate: 50,
    rating: 4.5,
    createdAt: '2023-01-01T00:00:00.000Z'
  }
};

// Mock sessions data
const mockSessions = {
  'session123': {
    id: 'session123',
    tutorId: 'tutor123',
    studentId: 'student123',
    subject: 'mathematics',
    date: '2024-03-20',
    startTime: '14:00',
    endTime: '15:00',
    status: 'confirmed',
    paymentStatus: 'paid',
    createdAt: '2024-03-15T00:00:00.000Z'
  }
};

// Mock subjects
const mockSubjects = [
  { id: 'mathematics', name: 'Mathematics' },
  { id: 'physics', name: 'Physics' },
  { id: 'chemistry', name: 'Chemistry' }
];

// Mock reviews
const mockReviews = [
  {
    id: 'review123',
    sessionId: 'session123',
    tutorId: 'tutor123',
    studentId: 'student123',
    rating: 4.5,
    comment: 'Great tutor!',
    createdAt: '2024-03-21T00:00:00.000Z'
  }
];

// Export all mocks
module.exports = {
  mockFirebaseAuth,
  mockFirestore,
  mockStorage,
  mockUsers,
  mockSessions,
  mockSubjects,
  mockReviews
}; 