/**
 * Validates if the provided GPA meets the minimum requirement for tutors
 * @param {string} gpa - The GPA to validate
 * @returns {boolean} - Whether the GPA is valid (≥ 3.50 and ≤ 4.00)
 */
export const validateGPA = (gpa) => {
  const gpaFloat = parseFloat(gpa);
  return !isNaN(gpaFloat) && gpaFloat >= 3.50 && gpaFloat <= 4.00;
};

/**
 * Validates an email address format
 * @param {string} email - The email to validate
 * @returns {boolean} - Whether the email format is valid
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates password meets minimum requirements
 * @param {string} password - The password to validate
 * @returns {boolean} - Whether the password meets requirements
 */
export const validatePassword = (password) => {
  return password && password.length >= 6;
};

/**
 * Validates a phone number format
 * @param {string} phoneNumber - The phone number to validate
 * @returns {boolean} - Whether the phone number format is valid
 */
export const validatePhoneNumber = (phoneNumber) => {
  const phoneRegex = /^\d{10,15}$/;
  return phoneRegex.test(phoneNumber.replace(/\D/g, ''));
};

/**
 * Validates that a tutor has selected at least one subject
 * @param {array} subjects - Array of selected subjects
 * @returns {boolean} - Whether the subjects selection is valid
 */
export const validateSubjectSelection = (subjects) => {
  return Array.isArray(subjects) && subjects.length > 0;
};

/**
 * Validates hourly rate is a positive number
 * @param {string|number} hourlyRate - The hourly rate to validate
 * @returns {boolean} - Whether the hourly rate is valid
 */
export const validateHourlyRate = (hourlyRate) => {
  const rate = parseFloat(hourlyRate);
  return !isNaN(rate) && rate > 0;
};

/**
 * Validates tutor registration form
 * @param {object} formData - The form data to validate
 * @returns {object} - Object containing validation results and errors
 */
export const validateTutorForm = (formData) => {
  const errors = {};
  
  if (!validateEmail(formData.email)) {
    errors.email = 'Please enter a valid email address';
  }
  
  if (!validatePassword(formData.password)) {
    errors.password = 'Password must be at least 6 characters';
  }
  
  if (!formData.fullName || formData.fullName.trim() === '') {
    errors.fullName = 'Full name is required';
  }
  
  if (!validateGPA(formData.gpa)) {
    errors.gpa = 'GPA must be at least 3.50 and at most 4.00';
  }
  
  if (!validateSubjectSelection(formData.subjects)) {
    errors.subjects = 'Please select at least one subject';
  }
  
  if (!validateHourlyRate(formData.hourlyRate)) {
    errors.hourlyRate = 'Please enter a valid hourly rate';
  }
  
  if (!validatePhoneNumber(formData.phoneNumber)) {
    errors.phoneNumber = 'Please enter a valid phone number';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}; 