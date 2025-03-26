import React from 'react';
import { View, Image, StyleSheet, StatusBar } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const LandingScreen = ({ navigation }) => {
  const theme = useTheme();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#9C27B0" />
      <LinearGradient
        colors={['#9C27B0', '#673AB7']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../../assets/icon.png')} 
            style={styles.logo} 
            resizeMode="contain"
          />
          <Text style={styles.title}>EduBro</Text>
          <Text style={styles.subtitle}>Learn, Teach, Succeed Together</Text>
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
            onPress={() => navigation.navigate('Register')}
          >
            Get Started
          </Button>
          
          <Button 
            mode="outlined" 
            style={styles.secondaryButton}
            contentStyle={styles.buttonContent}
            labelStyle={[styles.buttonText, { color: theme.colors.primary }]}
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
    backgroundColor: '#F8F9FA',
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
  logo: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
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
    fontSize: 16,
    textAlign: 'center',
    color: '#424242',
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
  },
  secondaryButton: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#9C27B0',
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