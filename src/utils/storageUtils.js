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

// Pick an image from the media library
export const pickImage = async () => {
  try {
    // Request permission first
    const permissionResult = await requestMediaLibraryPermission();
    if (!permissionResult.success) {
      return permissionResult;
    }

    // Launch the image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    console.log('Image picker result:', JSON.stringify(result));

    if (result.canceled) {
      return { success: false, error: 'User canceled the image selection' };
    }

    return { success: true, uri: result.assets[0].uri };
  } catch (error) {
    console.error('Error picking image:', error);
    return { success: false, error: `Error selecting image: ${error.message}` };
  }
};

// Upload image to Firebase Storage
export const uploadImage = async (uri, path, filename) => {
  try {
    console.log(`Attempting to upload image to path: ${path}/${filename}`);
    
    // Convert URI to blob
    const blob = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = () => {
        resolve(xhr.response);
      };
      xhr.onerror = (e) => {
        reject(new Error(`Network request failed: ${e.message}`));
      };
      xhr.responseType = 'blob';
      xhr.open('GET', uri, true);
      xhr.send(null);
    });

    // Check if blob was created successfully
    if (!blob) {
      console.error('Failed to create blob from image URI');
      return { success: false, error: 'Failed to process image data' };
    }

    // Log blob information for debugging
    console.log(`Blob created with size: ${blob.size} bytes`);

    // Create storage reference
    const storageRef = ref(storage, `${path}/${filename}`);
    console.log(`Storage reference created for: ${path}/${filename}`);
    
    // Upload the blob
    const uploadTask = uploadBytesResumable(storageRef, blob);
    
    // Wait for the upload to complete
    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          // Progress monitoring can be added here if needed
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          console.log(`Upload is ${progress}% done`);
        },
        (error) => {
          // Error handling
          console.error('Error uploading image:', error);
          // Include more details about the error
          const errorMessage = error.message || 'Unknown error';
          const errorCode = error.code || 'unknown';
          console.error(`Firebase error code: ${errorCode}`);
          
          try {
            blob.close();
          } catch (e) {
            console.error('Error closing blob:', e);
          }
          
          reject({ 
            success: false, 
            error: errorMessage,
            code: errorCode 
          });
        },
        async () => {
          // Upload completed successfully
          console.log('Upload completed successfully!');
          try {
            blob.close();
          } catch (e) {
            console.error('Error closing blob:', e);
          }
          
          try {
            // Get the download URL
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            console.log('File available at:', downloadURL);
            resolve({ success: true, url: downloadURL });
          } catch (error) {
            console.error('Error getting download URL:', error);
            reject({ 
              success: false, 
              error: `Error getting download URL: ${error.message}`,
              code: error.code || 'unknown' 
            });
          }
        }
      );
    });
  } catch (error) {
    console.error('Error in the upload process:', error);
    return { 
      success: false, 
      error: `Error in upload process: ${error.message}`,
      code: error.code || 'unknown'
    };
  }
};

// Update user's profile picture
export const updateProfilePicture = async (userId, uri) => {
  try {
    if (!userId) {
      console.error('User ID is missing');
      return { success: false, error: 'User ID is required' };
    }
    
    if (!uri) {
      console.error('Image URI is missing');
      return { success: false, error: 'Image URI is required' };
    }
    
    console.log(`Updating profile picture for user: ${userId}`);
    
    // Generate a unique filename using the current timestamp
    const filename = `profile_${userId}_${Date.now()}.jpg`;
    
    // Upload the image to the 'profile_pictures' folder
    const uploadResult = await uploadImage(uri, 'profile_pictures', filename);
    
    if (!uploadResult.success) {
      console.error('Error updating profile picture:', uploadResult.error);
      return uploadResult;
    }
    
    console.log('Profile picture updated successfully:', uploadResult.url);
    return { success: true, url: uploadResult.url };
  } catch (error) {
    console.error('Error updating profile picture:', error);
    return { 
      success: false, 
      error: `Error updating profile picture: ${error.message}`,
      code: error.code || 'unknown'
    };
  }
}; 