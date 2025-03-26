import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Modal, TouchableOpacity, Platform } from 'react-native';
import { Text, Button, Card, useTheme, ActivityIndicator, List, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { getUserSessions, updateSessionStatus, rescheduleSession } from '../../utils/tutorUtils';
import { processRefund } from '../../utils/paymentUtils';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker'; 