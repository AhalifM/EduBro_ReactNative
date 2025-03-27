import React from 'react';
import { View, Image, StyleSheet, StatusBar } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const LandingScreen = ({ navigation }) => {
  const theme = useTheme();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4b0082" />
      <LinearGradient
        colors={['#6a0dad', '#4b0082']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.logoContainer}>
          <View style={styles.logoWrapper}>
            <Image 
              source={require('../../../assets/icon.png')} 
              style={styles.logo} 
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}></Text>
          <Text style={styles.subtitle}></Text>
        </View>
      </LinearGradient>
      
      <View style={styles.contentContainer}>
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            Connect with fellow students for peer tutoring. Join a community where students help students excel.
          </Text>
        </View>
        
        <View style={styles.buttonContainer}>
          <Button 
            mode="contained" 
            style={styles.primaryButton}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonText}
            color="#6a0dad"
            onPress={() => navigation.navigate('Register')}
          >
            Get Started
          </Button>
          
          <Button 
            mode="outlined" 
            style={styles.secondaryButton}
            contentStyle={styles.buttonContent}
            labelStyle={[styles.buttonText, { color: '#E0E0E0' }]}
            onPress={() => navigation.navigate('Login')}
          >
            I Already Have an Account
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  gradient: {
    height: '45%',
    width: '100%',
    paddingTop: 20,
  },
  logoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrapper: {
    width: 325,
    height: 325,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 0,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.44,
    shadowRadius: 10.32,
    elevation: 16,
  },
  logo: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  title: {
    fontSize: 50,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
    letterSpacing: 1,
    fontFamily: 'System',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    letterSpacing: 2,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#121212',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -30,
    paddingHorizontal: 24,
    paddingTop: 30,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#E0E0E0',
    lineHeight: 24,
    letterSpacing: 0.3,
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 40,
  },
  primaryButton: {
    marginBottom: 16,
    elevation: 2,
    borderRadius: 12,
    backgroundColor: '#6a0dad',
  },
  secondaryButton: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  buttonContent: {
    height: 56,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

export default LandingScreen; 