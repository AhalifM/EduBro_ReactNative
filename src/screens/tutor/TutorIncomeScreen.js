import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  Platform
} from 'react-native';
import { useTheme, Card } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { getTutorIncome } from '../../utils/incomeUtils';
import { useAuth } from '../../contexts/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

const TutorIncomeScreen = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [incomeData, setIncomeData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchIncomeData = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const result = await getTutorIncome(user.uid);
      
      if (result.success) {
        setIncomeData(result);
      } else {
        console.error('Failed to fetch income data:', result.error);
      }
    } catch (error) {
      console.error('Error fetching income data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  // Fetch data when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchIncomeData();
    }, [fetchIncomeData])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchIncomeData();
  };

  const formatCurrency = (amount) => {
    return `$${amount.toFixed(2)}`;
  };

  const renderOverviewTab = () => {
    if (!incomeData) return null;

    const {
      totalIncome,
      currentMonthIncome,
      previousMonthIncome,
      monthlyGrowth,
      upcomingIncome,
      uniqueStudentCount,
      recentIncome
    } = incomeData;

    return (
      <View style={styles.tabContent}>
        <View style={styles.statCardsContainer}>
          {/* Total Earnings Card */}
          <Card style={styles.statCard}>
            <View style={styles.statCardContent}>
              <MaterialIcons name="account-balance-wallet" size={28} color="#9C27B0" style={styles.statIcon} />
              <Text style={styles.statTitle}>Total Earnings</Text>
              <Text style={styles.statValue}>{formatCurrency(totalIncome)}</Text>
            </View>
          </Card>

          {/* This Month Card */}
          <Card style={styles.statCard}>
            <View style={styles.statCardContent}>
              <MaterialIcons name="calendar-today" size={28} color="#9C27B0" style={styles.statIcon} />
              <Text style={styles.statTitle}>This Month</Text>
              <Text style={styles.statValue}>{formatCurrency(currentMonthIncome)}</Text>
              <View style={styles.growthContainer}>
                <MaterialIcons 
                  name={monthlyGrowth >= 0 ? "trending-up" : "trending-down"} 
                  size={16} 
                  color={monthlyGrowth >= 0 ? '#4CAF50' : '#F44336'} 
                />
                <Text style={[
                  styles.growthText, 
                  {color: monthlyGrowth >= 0 ? '#4CAF50' : '#F44336'}
                ]}>
                  {monthlyGrowth.toFixed(1)}%
                </Text>
              </View>
            </View>
          </Card>

          {/* Upcoming Earnings Card */}
          <Card style={styles.statCard}>
            <View style={styles.statCardContent}>
              <MaterialIcons name="date-range" size={28} color="#9C27B0" style={styles.statIcon} />
              <Text style={styles.statTitle}>Upcoming</Text>
              <Text style={styles.statValue}>{formatCurrency(upcomingIncome)}</Text>
            </View>
          </Card>

          {/* Unique Students Card */}
          <Card style={styles.statCard}>
            <View style={styles.statCardContent}>
              <MaterialIcons name="people" size={28} color="#9C27B0" style={styles.statIcon} />
              <Text style={styles.statTitle}>Students</Text>
              <Text style={styles.statValue}>{uniqueStudentCount}</Text>
            </View>
          </Card>
        </View>

        <Card style={styles.recentEarningsCard}>
          <View style={styles.recentEarningsContent}>
            <MaterialIcons name="timeline" size={28} color="#9C27B0" style={styles.recentEarningsIcon} />
            <Text style={styles.recentEarningsTitle}>Recent Earnings (30 days)</Text>
            <Text style={styles.recentEarningsAmount}>{formatCurrency(recentIncome)}</Text>
          </View>
        </Card>

        <View style={styles.summaryContainer}>
          <Text style={styles.sectionTitle}>Income Summary</Text>
          <View style={styles.comparisonContainer}>
            <View style={styles.comparisonItem}>
              <MaterialIcons name="today" size={28} color="#9C27B0" style={styles.comparisonIcon} />
              <Text style={styles.comparisonLabel}>This Month</Text>
              <Text style={styles.comparisonValue}>{formatCurrency(currentMonthIncome)}</Text>
            </View>
            <View style={styles.comparisonDivider} />
            <View style={styles.comparisonItem}>
              <MaterialIcons name="history" size={28} color="#9C27B0" style={styles.comparisonIcon} />
              <Text style={styles.comparisonLabel}>Last Month</Text>
              <Text style={styles.comparisonValue}>{formatCurrency(previousMonthIncome)}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderMonthlyTab = () => {
    if (!incomeData || !incomeData.monthlyIncome) return null;

    return (
      <View style={styles.tabContent}>
        <Text style={styles.sectionTitle}>Monthly Breakdown</Text>
        {incomeData.monthlyIncome.length > 0 ? (
          incomeData.monthlyIncome.map((item, index) => (
            <Card key={`${item.month}-${item.year}`} style={styles.monthlyCard}>
              <Card.Content>
                <View style={styles.monthlyCardHeader}>
                  <Text style={styles.monthYear}>{item.month} {item.year}</Text>
                  <Text style={styles.monthlyAmount}>{formatCurrency(item.amount)}</Text>
                </View>
                <View style={styles.monthlyCardDetails}>
                  <View style={styles.monthlyDetailItem}>
                    <MaterialIcons name="event" size={16} color="#9C27B0" />
                    <Text style={styles.monthlyDetailText}>{item.sessionCount} sessions</Text>
                  </View>
                  <View style={styles.monthlyDetailItem}>
                    <MaterialIcons name="attach-money" size={16} color="#9C27B0" />
                    <Text style={styles.monthlyDetailText}>
                      Avg: {formatCurrency(item.amount / item.sessionCount)}
                    </Text>
                  </View>
                </View>
              </Card.Content>
            </Card>
          ))
        ) : (
          <Text style={styles.emptyText}>No monthly data available</Text>
        )}
      </View>
    );
  };

  const renderSubjectsTab = () => {
    if (!incomeData || !incomeData.subjectIncome) return null;

    return (
      <View style={styles.tabContent}>
        <Text style={styles.sectionTitle}>Earnings by Subject</Text>
        {incomeData.subjectIncome.length > 0 ? (
          incomeData.subjectIncome.map((item, index) => (
            <Card key={item.subject} style={styles.subjectCard}>
              <Card.Content>
                <View style={styles.subjectCardHeader}>
                  <Text style={styles.subjectName}>
                    {item.subject.charAt(0).toUpperCase() + item.subject.slice(1)}
                  </Text>
                  <Text style={styles.subjectAmount}>{formatCurrency(item.amount)}</Text>
                </View>
                <View style={styles.progressBarContainer}>
                  <View 
                    style={[
                      styles.progressBar, 
                      { 
                        width: `${(item.amount / incomeData.totalIncome) * 100}%`,
                        backgroundColor: getSubjectColor(index)
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.subjectSessions}>{item.sessionCount} sessions</Text>
              </Card.Content>
            </Card>
          ))
        ) : (
          <Text style={styles.emptyText}>No subject data available</Text>
        )}
      </View>
    );
  };

  const getSubjectColor = (index) => {
    const colors = ['#9C27B0', '#E91E63', '#3F51B5', '#FF9800', '#4CAF50'];
    return colors[index % colors.length];
  };

  if (loading && !incomeData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9C27B0" />
        <Text style={styles.loadingText}>Loading income data...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <StatusBar style="light" />
      
      <View style={styles.headerContainer}>
        <LinearGradient
          colors={['#9C27B0', '#E91E63']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0.7 }}
          style={styles.headerGradient}
        >
          <SafeAreaView edges={['top']} style={styles.safeAreaTop}>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Income Dashboard</Text>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'monthly' && styles.activeTab]}
          onPress={() => setActiveTab('monthly')}
        >
          <Text style={[styles.tabText, activeTab === 'monthly' && styles.activeTabText]}>
            Monthly
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'subjects' && styles.activeTab]}
          onPress={() => setActiveTab('subjects')}
        >
          <Text style={[styles.tabText, activeTab === 'subjects' && styles.activeTabText]}>
            Subjects
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#9C27B0"]} />
        }
        style={styles.contentContainer}
      >
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'monthly' && renderMonthlyTab()}
        {activeTab === 'subjects' && renderSubjectsTab()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  safeAreaTop: {
    width: '100%',
  },
  headerContainer: {
    overflow: 'hidden',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 4,
    shadowColor: '#9C27B0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  headerGradient: {
    width: '100%',
  },
  headerContent: {
    padding: 20,
    paddingTop: Platform.OS === 'android' ? 16 : 0,
    paddingBottom: 24,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#4B5563',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#9C27B0',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  activeTabText: {
    color: '#9C27B0',
    fontWeight: 'bold',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  tabContent: {
    marginBottom: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  statCardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  statCard: {
    width: '48%',
    marginBottom: 16,
    elevation: 2,
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  statCardContent: {
    padding: 16,
    position: 'relative',
    minHeight: 90,
    justifyContent: 'flex-start',
  },
  statTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    marginTop: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  statIcon: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  growthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  growthText: {
    fontSize: 12,
    marginLeft: 4,
  },
  recentEarningsCard: {
    marginVertical: 8,
    elevation: 2,
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  recentEarningsContent: {
    padding: 16,
    position: 'relative',
    minHeight: 90,
    justifyContent: 'flex-start',
  },
  recentEarningsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
    marginTop: 4,
  },
  recentEarningsAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#9C27B0',
  },
  recentEarningsIcon: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  summaryContainer: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  comparisonContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  comparisonItem: {
    flex: 1,
    alignItems: 'center',
  },
  comparisonIcon: {
    marginBottom: 8,
  },
  comparisonDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 10,
  },
  comparisonLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  comparisonValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  monthlyCard: {
    marginBottom: 12,
    elevation: 2,
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  monthlyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  monthYear: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  monthlyAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#9C27B0',
  },
  monthlyCardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  monthlyDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthlyDetailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  subjectCard: {
    marginBottom: 12,
    elevation: 2,
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  subjectCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  subjectName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  subjectAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#9C27B0',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  subjectSessions: {
    fontSize: 14,
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
    padding: 30,
  },
});

export default TutorIncomeScreen; 