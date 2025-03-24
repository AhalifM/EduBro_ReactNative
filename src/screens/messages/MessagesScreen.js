import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const MessagesScreen = () => {
  const theme = useTheme();
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Messages</Text>
        <Text style={styles.subtitle}>
          This feature is coming soon! You will be able to chat with your tutors and students.
        </Text>
        <Text style={styles.info}>
          For now, contact information is shared when a session is booked.
        </Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
    color: '#555',
  },
  info: {
    fontSize: 14,
    textAlign: 'center',
    color: '#777',
  },
});

export default MessagesScreen; 