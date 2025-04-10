import { storage } from '../firebase/config';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

// Request permission to access the photo library
export const requestMediaLibraryPermission = async () => {
  if (Platform.OS !== 'web') {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return { success: false, error: 'Permission to access photos is required!' };
    }
  }
  return { success: true };
};

// Simple implementation for profile picture upload
export const updateProfilePicture = async (userId, uri) => {
  try {
    console.log('Starting profile picture update for user:', userId);
    
    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }
    
    if (!uri) {
      return { success: false, error: 'Image URI is required' };
    }

    // Create a unique filename with timestamp
    const timestamp = Date.now();
    const filename = `profile_${userId}_${timestamp}.jpg`;
    
    // Create the full path in Firebase Storage
    const storagePath = `profile_pictures/${userId}/${filename}`;
    console.log('Upload path:', storagePath);
    
    // Create a reference to the storage location
    const storageRef = ref(storage, storagePath);
    
    // Upload the image directly
    const response = await fetch(uri);
    const blob = await response.blob();
    
    console.log('Starting upload to Firebase Storage...');
    const uploadTask = await uploadBytesResumable(storageRef, blob);
    console.log('Upload complete');
    
    // Get the download URL
    const downloadUrl = await getDownloadURL(uploadTask.ref);
    console.log('Image available at:', downloadUrl);
    
    return { success: true, url: downloadUrl };
  } catch (error) {
    console.error('Error updating profile picture:', error);
    return {
      success: false,
      error: error.message || 'Failed to update profile picture',
      code: error.code || 'unknown'
    };
  }
}; 