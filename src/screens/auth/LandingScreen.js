import React from 'react';
import { View, Image, StyleSheet, StatusBar } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const LandingScreen = ({ navigation }) => {
  const theme = useTheme();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.logoContainer}>
        <Image 
          source={require('../../../assets/icon.png')} 
          style={styles.logo} 
          resizeMode="contain"
        />
        <Text style={styles.title}>EduBro</Text>
        <Text style={styles.subtitle}>Learn, Teach, Succeed Together</Text>
      </View>
      
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          Connect with fellow students for peer tutoring. Join a community where students help students excel.
        </Text>
      </View>
      
      <View style={styles.buttonContainer}>
        <Button 
          mode="contained" 
          style={[styles.button, { backgroundColor: theme.colors.primary }]}
          labelStyle={styles.buttonText}
          onPress={() => navigation.navigate('Register')}
        >
          Get Started
        </Button>
        
        <Button 
          mode="outlined" 
          style={styles.button}
          labelStyle={[styles.buttonText, { color: theme.colors.primary }]}
          onPress={() => navigation.navigate('Login')}
        >
          I Already Have an Account
        </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  logoContainer: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  infoText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    lineHeight: 24,
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  button: {
    marginBottom: 15,
    paddingVertical: 5,
    borderRadius: 10,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    padding: 4,
  },
});

export default LandingScreen; 