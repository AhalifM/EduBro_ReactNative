import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { TextInput, Button, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { loginUser } from '../../utils/auth';
import { CommonActions } from '@react-navigation/native';

const LoginScreen = ({ navigation, route }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  
  const theme = useTheme();

  // Check if there's a message from registration screen
  useEffect(() => {
    if (route.params?.message) {
      setMessage(route.params.message);
    }
  }, [route.params]);

  const validateForm = () => {
    if (!email || !password) {
      setError('Email and password are required');
      return false;
    }
    return true;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    setError('');
    setMessage('');
    
    console.log('Attempting login with:', email);
    
    try {
      console.log('Calling loginUser...');
      const result = await loginUser(email, password);
      console.log('Login result:', result);
      
      if (result.success) {
        console.log('Login successful!');
        // Add explicit navigation based on user role
        const userRole = result.user.role;
        console.log('Navigating based on role:', userRole);
        
        // Use CommonActions.reset to clear the navigation stack
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: userRole === 'student' ? 'Student' : userRole === 'tutor' ? 'Tutor' : 'Admin' }],
          })
        );
      } else {
        console.log('Login failed with error:', result.error);
        setError(result.error);
      }
    } catch (err) {
      console.error('Login exception:', err);
      setError('Login failed. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome Back</Text>
        
        {message ? <Text style={styles.messageText}>{message}</Text> : null}
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
        
        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          mode="outlined"
          secureTextEntry={!passwordVisible}
          right={
            <TextInput.Icon
              icon={passwordVisible ? 'eye-off' : 'eye'}
              onPress={() => setPasswordVisible(!passwordVisible)}
            />
          }
        />
        
        <Button
          mode="contained"
          onPress={handleLogin}
          style={styles.button}
          loading={loading}
          disabled={loading}
        >
          Login
        </Button>
        
        <View style={styles.registerContainer}>
          <Text>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>Register</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={styles.forgotPassword}>
          <Text style={{ color: theme.colors.primary }}>Forgot Password?</Text>
        </TouchableOpacity>
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
  input: {
    marginBottom: 16,
  },
  button: {
    marginVertical: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 16,
  },
  forgotPassword: {
    alignSelf: 'center',
    marginTop: 8,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 16,
  },
  messageText: {
    color: 'green',
    textAlign: 'center',
    marginBottom: 16,
  },
});

export default LoginScreen; 