import { 
  validateGPA, 
  validateEmail, 
  validatePassword, 
  validatePhoneNumber,
  validateSubjectSelection,
  validateHourlyRate,
  validateTutorForm
} from '../../utils/validation';

describe('Validation Utilities', () => {
  // Test GPA validation
  describe('GPA Validation', () => {
    test('accepts valid GPAs', () => {
      expect(validateGPA('3.50')).toBe(true);
      expect(validateGPA('3.75')).toBe(true);
      expect(validateGPA('4.00')).toBe(true);
      expect(validateGPA(3.85)).toBe(true);
    });

    test('rejects invalid GPAs', () => {
      expect(validateGPA('3.49')).toBe(false);
      expect(validateGPA('4.01')).toBe(false);
      expect(validateGPA('abc')).toBe(false);
      expect(validateGPA('')).toBe(false);
    });
  });

  // Test email validation
  describe('Email Validation', () => {
    test('accepts valid email addresses', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
      expect(validateEmail('student123@university.edu')).toBe(true);
    });

    test('rejects invalid email addresses', () => {
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('test@domain')).toBe(false);
      expect(validateEmail('test.com')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });
  });

  // Test password validation
  describe('Password Validation', () => {
    test('accepts valid passwords', () => {
      expect(validatePassword('password123')).toBe(true);
      expect(validatePassword('Secure_P@ss')).toBe(true);
      expect(validatePassword('123456')).toBe(true);
    });

    test('rejects invalid passwords', () => {
      expect(validatePassword('12345')).toBe(false); // Too short
      expect(validatePassword('')).toBe(false);
      expect(validatePassword(null)).toBe(false);
      expect(validatePassword(undefined)).toBe(false);
    });
  });

  // Test phone number validation
  describe('Phone Number Validation', () => {
    test('accepts valid phone numbers', () => {
      expect(validatePhoneNumber('1234567890')).toBe(true);
      expect(validatePhoneNumber('123-456-7890')).toBe(true);
      expect(validatePhoneNumber('+1 (123) 456-7890')).toBe(true);
    });

    test('rejects invalid phone numbers', () => {
      expect(validatePhoneNumber('123')).toBe(false); // Too short
      expect(validatePhoneNumber('abcdefghij')).toBe(false); // Non-numeric
      expect(validatePhoneNumber('')).toBe(false);
    });
  });

  // Test subject selection validation
  describe('Subject Selection Validation', () => {
    test('accepts valid subject selections', () => {
      expect(validateSubjectSelection(['math'])).toBe(true);
      expect(validateSubjectSelection(['math', 'physics'])).toBe(true);
    });

    test('rejects invalid subject selections', () => {
      expect(validateSubjectSelection([])).toBe(false); // Empty array
      expect(validateSubjectSelection('math')).toBe(false); // Not an array
      expect(validateSubjectSelection(null)).toBe(false);
    });
  });

  // Test hourly rate validation
  describe('Hourly Rate Validation', () => {
    test('accepts valid hourly rates', () => {
      expect(validateHourlyRate('50')).toBe(true);
      expect(validateHourlyRate('25.50')).toBe(true);
      expect(validateHourlyRate(75)).toBe(true);
    });

    test('rejects invalid hourly rates', () => {
      expect(validateHourlyRate('0')).toBe(false); // Zero
      expect(validateHourlyRate('-10')).toBe(false); // Negative
      expect(validateHourlyRate('abc')).toBe(false); // Non-numeric
      expect(validateHourlyRate('')).toBe(false);
    });
  });

  // Test complete tutor form validation
  describe('Tutor Form Validation', () => {
    test('validates complete valid form', () => {
      const validForm = {
        email: 'tutor@example.com',
        password: 'password123',
        fullName: 'John Doe',
        gpa: '3.75',
        subjects: ['math', 'physics'],
        hourlyRate: '50',
        phoneNumber: '1234567890'
      };

      const result = validateTutorForm(validForm);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    test('validates form with multiple errors', () => {
      const invalidForm = {
        email: 'invalid-email',
        password: '123', // Too short
        fullName: '',
        gpa: '3.40', // Below minimum
        subjects: [],
        hourlyRate: 'abc',
        phoneNumber: '123'
      };

      const result = validateTutorForm(invalidForm);
      expect(result.isValid).toBe(false);
      expect(Object.keys(result.errors).length).toBe(7); // All fields have errors
    });
  });
}); 