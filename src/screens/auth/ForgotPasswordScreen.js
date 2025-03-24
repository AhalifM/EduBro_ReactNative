import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { resetPassword } from '../../utils/auth';

const ForgotPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const theme = useTheme();

  const handleResetPassword = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const result = await resetPassword(email);
      
      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to send reset email. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Reset Password</Text>
        
        {!success ? (
          <>
            <Text style={styles.instructions}>
              Enter your email address and we'll send you a link to reset your password.
            </Text>
            
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            
            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <Button
              mode="contained"
              onPress={handleResetPassword}
              style={styles.button}
              loading={loading}
              disabled={loading}
            >
              Send Reset Link
            </Button>
          </>
        ) : (
          <View style={styles.successContainer}>
            <Text style={styles.successText}>
              Reset password link has been sent to your email.
            </Text>
            <Text style={styles.successSubText}>
              Please check your inbox and follow the instructions to reset your password.
            </Text>
          </View>
        )}
        
        <Button
          mode="text"
          onPress={() => navigation.navigate('Login')}
          style={styles.backButton}
        >
          Back to Login
        </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  instructions: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginVertical: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  backButton: {
    marginTop: 16,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 16,
  },
  successContainer: {
    backgroundColor: '#e6f7ee',
    padding: 20,
    borderRadius: 10,
    marginVertical: 20,
  },
  successText: {
    color: '#2e7d32',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  successSubText: {
    color: '#2e7d32',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default ForgotPasswordScreen; 