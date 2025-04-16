import {
  loginUser,
  registerUser,
  resetPassword,
  isValidImageUrl
} from '../../utils/auth';

// Mock Firebase modules
jest.mock('../../firebase/config', () => {
  const auth = {
    signInWithEmailAndPassword: jest.fn(),
    createUserWithEmailAndPassword: jest.fn(),
    sendPasswordResetEmail: jest.fn()
  };

  const db = {
    collection: jest.fn(),
    doc: jest.fn(),
    setDoc: jest.fn(),
    getDoc: jest.fn()
  };

  return { auth, db };
});

describe('Auth Services', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  // Test login functionality
  describe('Login User', () => {
    test('successful login', async () => {
      // Mock successful Firebase login
      const mockUser = { uid: 'user123', email: 'test@example.com' };
      const mockUserDoc = { data: () => ({ role: 'student', fullName: 'Test User' }) };
      
      // Setup mocks
      require('../../firebase/config').auth.signInWithEmailAndPassword.mockResolvedValue({ 
        user: mockUser 
      });
      require('../../firebase/config').db.doc.mockReturnValue({});
      require('../../firebase/config').db.getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ role: 'student', fullName: 'Test User' })
      });

      // Test the function
      const result = await loginUser('test@example.com', 'password123');
      
      // Assertions
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user.role).toBe('student');
    });

    test('login with invalid credentials', async () => {
      // Mock Firebase auth error
      require('../../firebase/config').auth.signInWithEmailAndPassword.mockRejectedValue({
        code: 'auth/user-not-found'
      });

      // Test the function
      const result = await loginUser('nonexistent@example.com', 'password123');
      
      // Assertions
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // Test registration functionality
  describe('Register User', () => {
    test('successful registration', async () => {
      // Mock successful Firebase registration
      const mockUser = { uid: 'newuser123', email: 'newuser@example.com' };
      
      // Setup mocks
      require('../../firebase/config').auth.createUserWithEmailAndPassword.mockResolvedValue({ 
        user: mockUser 
      });
      require('../../firebase/config').db.doc.mockReturnValue({});
      require('../../firebase/config').db.setDoc.mockResolvedValue({});

      // Test the function
      const result = await registerUser(
        'newuser@example.com',
        'password123',
        'New User',
        'student',
        {}
      );
      
      // Assertions
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
    });

    test('registration with existing email', async () => {
      // Mock Firebase auth error
      require('../../firebase/config').auth.createUserWithEmailAndPassword.mockRejectedValue({
        code: 'auth/email-already-in-use'
      });

      // Test the function
      const result = await registerUser(
        'existing@example.com',
        'password123',
        'Existing User',
        'student',
        {}
      );
      
      // Assertions
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // Test password reset functionality
  describe('Reset Password', () => {
    test('successful password reset request', async () => {
      // Mock successful Firebase password reset
      require('../../firebase/config').auth.sendPasswordResetEmail.mockResolvedValue();

      // Test the function
      const result = await resetPassword('test@example.com');
      
      // Assertions
      expect(result.success).toBe(true);
    });

    test('password reset with invalid email', async () => {
      // Mock Firebase auth error
      require('../../firebase/config').auth.sendPasswordResetEmail.mockRejectedValue({
        code: 'auth/user-not-found'
      });

      // Test the function
      const result = await resetPassword('nonexistent@example.com');
      
      // Assertions
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // Test utility functions
  describe('Utility Functions', () => {
    test('valid image URL validation', () => {
      expect(isValidImageUrl('https://example.com/image.jpg')).toBe(true);
      expect(isValidImageUrl('http://example.com/image.png')).toBe(true);
      expect(isValidImageUrl('data:image/jpeg;base64,ABC123')).toBe(true);
    });

    test('invalid image URL validation', () => {
      expect(isValidImageUrl('file://local/image.jpg')).toBe(false);
      expect(isValidImageUrl('www.example.com/image.jpg')).toBe(false);
      expect(isValidImageUrl('')).toBe(false);
      expect(isValidImageUrl(null)).toBe(false);
    });
  });
}); 