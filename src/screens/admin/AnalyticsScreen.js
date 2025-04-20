import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Dimensions } from 'react-native';
import { Text, Card, Divider, Button, ActivityIndicator, Title, Avatar, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, orderBy, limit, getCountFromServer } from 'firebase/firestore';
import { PieChart, LineChart, BarChart, ProgressChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');
const cardWidth = width * 0.45;
const screenWidth = Dimensions.get('window').width;

const AnalyticsScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    users: {
      total: 0,
      students: 0,
      tutors: 0,
      newUsersThisWeek: 0,
      activeUsersThisWeek: 0
    },
    sessions: {
      total: 0,
      completed: 0,
      upcoming: 0,
      cancelled: 0,
      todaySessions: 0
    },
    subjects: {
      popular: [],
      totalBookings: 0
    },
    financial: {
      totalRevenue: 0,
      thisMonthRevenue: 0,
      averageSessionPrice: 0,
      monthlyRevenue: [0, 0, 0, 0, 0, 0] // Last 6 months revenue
    },
    issues: {
      total: 0,
      pending: 0,
      resolved: 0
    },
    growth: {
      userGrowth: [0, 0, 0, 0, 0, 0, 0], // Weekly new users for past 7 weeks
      sessionTrends: [0, 0, 0, 0, 0, 0, 0] // Weekly sessions for past 7 weeks
    }
  });

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch user stats
      const userCountSnapshot = await getCountFromServer(collection(db, 'users'));
      const totalUsers = userCountSnapshot.data().count;
      
      const studentCountSnapshot = await getCountFromServer(query(
        collection(db, 'users'),
        where('role', '==', 'student')
      ));
      const studentCount = studentCountSnapshot.data().count;
      
      const tutorCountSnapshot = await getCountFromServer(query(
        collection(db, 'users'),
        where('role', '==', 'tutor')
      ));
      const tutorCount = tutorCountSnapshot.data().count;
      
      // Calculate new users this week
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const newUsersSnapshot = await getCountFromServer(query(
        collection(db, 'users'),
        where('createdAt', '>=', oneWeekAgo)
      ));
      const newUsersThisWeek = newUsersSnapshot.data().count;
      
      // Active users (estimate based on login timestamps)
      const activeUsersSnapshot = await getCountFromServer(query(
        collection(db, 'users'),
        where('lastLoginAt', '>=', oneWeekAgo)
      ));
      const activeUsersThisWeek = activeUsersSnapshot.data().count;
      
      // User growth data for the last 7 weeks
      const userGrowthData = [0, 0, 0, 0, 0, 0, 0];
      
      for (let i = 0; i < 7; i++) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - (7 * (i + 1)));
        
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 7);
        
        const weeklyUsersSnapshot = await getCountFromServer(query(
          collection(db, 'users'),
          where('createdAt', '>=', startDate),
          where('createdAt', '<', endDate)
        ));
        
        // Add data in reverse order (oldest first)
        userGrowthData[6 - i] = weeklyUsersSnapshot.data().count;
      }
      
      // Fetch session stats
      const sessionCountSnapshot = await getCountFromServer(collection(db, 'sessions'));
      const totalSessions = sessionCountSnapshot.data().count;
      
      const completedSessionsSnapshot = await getCountFromServer(query(
        collection(db, 'sessions'),
        where('status', '==', 'completed')
      ));
      const completedSessions = completedSessionsSnapshot.data().count;
      
      const upcomingSessionsSnapshot = await getCountFromServer(query(
        collection(db, 'sessions'),
        where('status', '==', 'upcoming')
      ));
      const upcomingSessions = upcomingSessionsSnapshot.data().count;
      
      const cancelledSessionsSnapshot = await getCountFromServer(query(
        collection(db, 'sessions'),
        where('status', '==', 'cancelled')
      ));
      const cancelledSessions = cancelledSessionsSnapshot.data().count;
      
      // Today's sessions
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const todaySessionsSnapshot = await getCountFromServer(query(
        collection(db, 'sessions'),
        where('startTime', '>=', today),
        where('startTime', '<', tomorrow)
      ));
      const todaySessions = todaySessionsSnapshot.data().count;
      
      // Session trends data for the last 7 weeks
      const sessionTrendsData = [0, 0, 0, 0, 0, 0, 0];
      
      for (let i = 0; i < 7; i++) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - (7 * (i + 1)));
        
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 7);
        
        const weeklySessionsSnapshot = await getCountFromServer(query(
          collection(db, 'sessions'),
          where('startTime', '>=', startDate),
          where('startTime', '<', endDate)
        ));
        
        // Add data in reverse order (oldest first)
        sessionTrendsData[6 - i] = weeklySessionsSnapshot.data().count;
      }
      
      // Popular subjects
      const subjectsQuery = query(
        collection(db, 'sessions'),
        where('status', '!=', 'cancelled'),
        orderBy('status'),
        orderBy('subject')
      );
      
      const subjectsSnapshot = await getDocs(subjectsQuery);
      const subjectsMap = {};
      
      subjectsSnapshot.forEach(doc => {
        const session = doc.data();
        if (session.subject) {
          if (!subjectsMap[session.subject]) {
            subjectsMap[session.subject] = 0;
          }
          subjectsMap[session.subject]++;
        }
      });
      
      const popularSubjects = Object.keys(subjectsMap)
        .map(subject => ({ subject, count: subjectsMap[subject] }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      
      // Financial metrics
      const sessionsSnapshot = await getDocs(query(
        collection(db, 'sessions'),
        where('status', '==', 'completed')
      ));
      
      let totalRevenue = 0;
      let thisMonthRevenue = 0;
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);
      
      // Monthly revenue data for the last 6 months
      const monthlyRevenueData = [0, 0, 0, 0, 0, 0];
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      // Initialize dates for last 6 months
      const lastSixMonths = [];
      for (let i = 0; i < 6; i++) {
        const monthDate = new Date();
        monthDate.setMonth(monthDate.getMonth() - i);
        monthDate.setDate(1);
        monthDate.setHours(0, 0, 0, 0);
        lastSixMonths.unshift(monthDate);
      }
      
      sessionsSnapshot.forEach(doc => {
        const session = doc.data();
        if (session.price) {
          totalRevenue += session.price;
          
          if (session.completedAt && session.completedAt.toDate() >= thisMonth) {
            thisMonthRevenue += session.price;
          }
          
          // Add to monthly revenue chart data
          if (session.completedAt) {
            const completionDate = session.completedAt.toDate();
            
            for (let i = 0; i < 6; i++) {
              const startMonth = lastSixMonths[i];
              
              // Calculate end of month
              let endMonth;
              if (i === 5) {
                // For current month, use current date
                endMonth = new Date();
              } else {
                // For previous months, use first day of next month
                endMonth = new Date(lastSixMonths[i + 1]);
              }
              
              if (completionDate >= startMonth && completionDate < endMonth) {
                monthlyRevenueData[i] += session.price;
                break;
              }
            }
          }
        }
      });
      
      const averageSessionPrice = sessionsSnapshot.size > 0 
        ? totalRevenue / sessionsSnapshot.size 
        : 0;
      
      // Issue stats
      const issuesCountSnapshot = await getCountFromServer(collection(db, 'reportedIssues'));
      const totalIssues = issuesCountSnapshot.data().count;
      
      const pendingIssuesSnapshot = await getCountFromServer(query(
        collection(db, 'reportedIssues'),
        where('status', 'in', ['pending', 'in_progress'])
      ));
      const pendingIssues = pendingIssuesSnapshot.data().count;
      
      const resolvedIssuesSnapshot = await getCountFromServer(query(
        collection(db, 'reportedIssues'),
        where('status', '==', 'resolved')
      ));
      const resolvedIssues = resolvedIssuesSnapshot.data().count;
      
      setStats({
        users: {
          total: totalUsers,
          students: studentCount,
          tutors: tutorCount,
          newUsersThisWeek,
          activeUsersThisWeek
        },
        sessions: {
          total: totalSessions,
          completed: completedSessions,
          upcoming: upcomingSessions,
          cancelled: cancelledSessions,
          todaySessions
        },
        subjects: {
          popular: popularSubjects,
          totalBookings: totalSessions - cancelledSessions
        },
        financial: {
          totalRevenue,
          thisMonthRevenue,
          averageSessionPrice,
          monthlyRevenue: monthlyRevenueData
        },
        issues: {
          total: totalIssues,
          pending: pendingIssues,
          resolved: resolvedIssues
        },
        growth: {
          userGrowth: userGrowthData,
          sessionTrends: sessionTrendsData
        }
      });
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);
  
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAnalytics();
  }, [fetchAnalytics]);
  
  const formatCurrency = (amount) => {
    return `$${amount.toFixed(2)}`;
  };
  
  const getLastSixMonthsLabels = () => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const labels = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      labels.push(monthNames[date.getMonth()]);
    }
    
    return labels;
  };
  
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9C27B0" />
        <Text style={styles.loadingText}>Loading analytics data...</Text>
      </View>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#9C27B0']} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <Text style={styles.headerSubtitle}>
            Analytics and platform insights
          </Text>
        </View>
        
        {/* User Stats Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="people" size={24} color="#9C27B0" />
            <Text style={styles.sectionTitle}>User Statistics</Text>
          </View>
          
          <View style={styles.cardsContainer}>
            <Card style={styles.statsCard}>
              <Card.Content>
                <Text style={styles.statValue}>{stats.users.total}</Text>
                <Text style={styles.statLabel}>Total Users</Text>
              </Card.Content>
            </Card>
            
            <Card style={styles.statsCard}>
              <Card.Content>
                <Text style={styles.statValue}>{stats.users.students}</Text>
                <Text style={styles.statLabel}>Students</Text>
              </Card.Content>
            </Card>
            
            <Card style={styles.statsCard}>
              <Card.Content>
                <Text style={styles.statValue}>{stats.users.tutors}</Text>
                <Text style={styles.statLabel}>Tutors</Text>
              </Card.Content>
            </Card>
            
            <Card style={styles.statsCard}>
              <Card.Content>
                <Text style={styles.statValue}>{stats.users.newUsersThisWeek}</Text>
                <Text style={styles.statLabel}>New This Week</Text>
              </Card.Content>
            </Card>
          </View>
          
          <Card style={styles.chartCard}>
            <Card.Content>
              <Text style={styles.chartTitle}>User Distribution</Text>
              <View style={styles.chartContainer}>
                <PieChart
                  data={[
                    {
                      name: 'Students',
                      population: stats.users.students,
                      color: '#4CAF50',
                      legendFontColor: '#7F7F7F',
                      legendFontSize: 13,
                    },
                    {
                      name: 'Tutors',
                      population: stats.users.tutors,
                      color: '#2196F3',
                      legendFontColor: '#7F7F7F',
                      legendFontSize: 13,
                    },
                    {
                      name: 'Others',
                      population: stats.users.total - (stats.users.students + stats.users.tutors),
                      color: '#9C27B0',
                      legendFontColor: '#7F7F7F',
                      legendFontSize: 13,
                    },
                  ]}
                  width={screenWidth - 60}
                  height={180}
                  chartConfig={{
                    backgroundColor: '#FFFFFF',
                    backgroundGradientFrom: '#FFFFFF',
                    backgroundGradientTo: '#FFFFFF',
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  }}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  absolute
                />
              </View>
            </Card.Content>
          </Card>
          
          <Card style={styles.chartCard}>
            <Card.Content>
              <Text style={styles.chartTitle}>Tutor to Student Ratio</Text>
              <View style={styles.chartContainer}>
                <ProgressChart
                  data={{
                    labels: ["Tutor Capacity"],
                    data: [
                      Math.min(
                        1, 
                        stats.users.tutors > 0 && stats.users.students > 0 
                          ? Math.min(1, (stats.users.tutors / stats.users.students) * 5) 
                          : 0
                      )
                    ]
                  }}
                  width={screenWidth - 60}
                  height={100}
                  strokeWidth={16}
                  radius={32}
                  chartConfig={{
                    backgroundColor: '#FFFFFF',
                    backgroundGradientFrom: '#FFFFFF',
                    backgroundGradientTo: '#FFFFFF',
                    decimalPlaces: 1,
                    color: (opacity = 1) => `rgba(156, 39, 176, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    style: {
                      borderRadius: 16
                    }
                  }}
                  hideLegend={false}
                  style={{
                    marginVertical: 8
                  }}
                />
                <Text style={styles.ratioText}>
                  {stats.users.tutors > 0 && stats.users.students > 0 
                    ? `1 tutor for every ${(stats.users.students / stats.users.tutors).toFixed(1)} students` 
                    : 'No data available'}
                </Text>
              </View>
            </Card.Content>
          </Card>
          
          <Card style={styles.chartCard}>
            <Card.Content>
              <Text style={styles.chartTitle}>Weekly New User Growth</Text>
              <View style={styles.chartContainer}>
                <LineChart
                  data={{
                    labels: ['W-6', 'W-5', 'W-4', 'W-3', 'W-2', 'W-1', 'This Week'],
                    datasets: [
                      {
                        data: stats.growth.userGrowth,
                        color: (opacity = 1) => `rgba(156, 39, 176, ${opacity})`,
                        strokeWidth: 2
                      }
                    ]
                  }}
                  width={screenWidth - 60}
                  height={220}
                  chartConfig={{
                    backgroundColor: '#FFFFFF',
                    backgroundGradientFrom: '#FFFFFF',
                    backgroundGradientTo: '#FFFFFF',
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(156, 39, 176, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    propsForDots: {
                      r: '6',
                      strokeWidth: '2',
                      stroke: '#9C27B0',
                    },
                    propsForBackgroundLines: {
                      strokeDasharray: '',
                    },
                  }}
                  bezier
                  style={{
                    marginVertical: 8,
                    borderRadius: 16,
                  }}
                />
              </View>
            </Card.Content>
          </Card>
          
          <Card style={styles.detailCard}>
            <Card.Content>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Active users (past week):</Text>
                <Text style={styles.detailValue}>{stats.users.activeUsersThisWeek}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Engagement rate:</Text>
                <Text style={styles.detailValue}>
                  {stats.users.total > 0 
                    ? `${((stats.users.activeUsersThisWeek / stats.users.total) * 100).toFixed(1)}%` 
                    : '0%'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Tutor/Student ratio:</Text>
                <Text style={styles.detailValue}>
                  {stats.users.students > 0 
                    ? `1:${(stats.users.students / stats.users.tutors).toFixed(1)}` 
                    : '0:0'}
                </Text>
              </View>
            </Card.Content>
          </Card>
        </View>
        
        {/* Sessions Stats Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="event" size={24} color="#9C27B0" />
            <Text style={styles.sectionTitle}>Sessions Data</Text>
          </View>
          
          <View style={styles.cardsContainer}>
            <Card style={styles.statsCard}>
              <Card.Content>
                <Text style={styles.statValue}>{stats.sessions.total}</Text>
                <Text style={styles.statLabel}>Total Sessions</Text>
              </Card.Content>
            </Card>
            
            <Card style={styles.statsCard}>
              <Card.Content>
                <Text style={styles.statValue}>{stats.sessions.completed}</Text>
                <Text style={styles.statLabel}>Completed</Text>
              </Card.Content>
            </Card>
            
            <Card style={styles.statsCard}>
              <Card.Content>
                <Text style={styles.statValue}>{stats.sessions.upcoming}</Text>
                <Text style={styles.statLabel}>Upcoming</Text>
              </Card.Content>
            </Card>
            
            <Card style={styles.statsCard}>
              <Card.Content>
                <Text style={styles.statValue}>{stats.sessions.todaySessions}</Text>
                <Text style={styles.statLabel}>Today</Text>
              </Card.Content>
            </Card>
          </View>
          
          <Card style={styles.chartCard}>
            <Card.Content>
              <Text style={styles.chartTitle}>Weekly Session Trends</Text>
              <View style={styles.chartContainer}>
                <LineChart
                  data={{
                    labels: ['W-6', 'W-5', 'W-4', 'W-3', 'W-2', 'W-1', 'This Week'],
                    datasets: [
                      {
                        data: stats.growth.sessionTrends,
                        color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
                        strokeWidth: 2
                      }
                    ]
                  }}
                  width={screenWidth - 60}
                  height={220}
                  chartConfig={{
                    backgroundColor: '#FFFFFF',
                    backgroundGradientFrom: '#FFFFFF',
                    backgroundGradientTo: '#FFFFFF',
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    propsForDots: {
                      r: '6',
                      strokeWidth: '2',
                      stroke: '#2196F3',
                    },
                    propsForBackgroundLines: {
                      strokeDasharray: '',
                    },
                  }}
                  bezier
                  style={{
                    marginVertical: 8,
                    borderRadius: 16,
                  }}
                />
              </View>
            </Card.Content>
          </Card>
          
          <Card style={styles.wideCard}>
            <Card.Content>
              <Text style={styles.cardTitle}>Popular Subjects</Text>
              {stats.subjects.popular.length > 0 ? (
                stats.subjects.popular.map((item, index) => (
                  <View key={index} style={styles.popularSubjectRow}>
                    <Text style={styles.subjectName}>{item.subject}</Text>
                    <View style={styles.bookingsContainer}>
                      <Text style={styles.bookingsCount}>{item.count}</Text>
                      <Text style={styles.bookingsLabel}>bookings</Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.noDataText}>No session data available</Text>
              )}
            </Card.Content>
          </Card>
          
          <Card style={styles.detailCard}>
            <Card.Content>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Completion rate:</Text>
                <Text style={styles.detailValue}>
                  {stats.sessions.total > 0 
                    ? `${((stats.sessions.completed / stats.sessions.total) * 100).toFixed(1)}%` 
                    : '0%'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Cancellation rate:</Text>
                <Text style={[
                  styles.detailValue, 
                  stats.sessions.total > 0 && (stats.sessions.cancelled / stats.sessions.total) > 0.2 
                    ? styles.negativeValue 
                    : null
                ]}>
                  {stats.sessions.total > 0 
                    ? `${((stats.sessions.cancelled / stats.sessions.total) * 100).toFixed(1)}%` 
                    : '0%'}
                </Text>
              </View>
            </Card.Content>
          </Card>
          
          <Card style={styles.chartCard}>
            <Card.Content>
              <Text style={styles.chartTitle}>Session Completion Rate</Text>
              <View style={styles.chartContainer}>
                <PieChart
                  data={[
                    {
                      name: 'Completed',
                      population: stats.sessions.completed,
                      color: '#4CAF50',
                      legendFontColor: '#7F7F7F',
                      legendFontSize: 13,
                    },
                    {
                      name: 'Upcoming',
                      population: stats.sessions.upcoming,
                      color: '#2196F3',
                      legendFontColor: '#7F7F7F',
                      legendFontSize: 13,
                    },
                    {
                      name: 'Cancelled',
                      population: stats.sessions.cancelled,
                      color: '#F44336',
                      legendFontColor: '#7F7F7F',
                      legendFontSize: 13,
                    },
                  ]}
                  width={screenWidth - 60}
                  height={180}
                  chartConfig={{
                    backgroundColor: '#FFFFFF',
                    backgroundGradientFrom: '#FFFFFF',
                    backgroundGradientTo: '#FFFFFF',
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  }}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  absolute
                />
              </View>
            </Card.Content>
          </Card>
        </View>
        
        {/* Financial Stats Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="attach-money" size={24} color="#9C27B0" />
            <Text style={styles.sectionTitle}>Financial Metrics</Text>
          </View>
          
          <View style={styles.cardsContainer}>
            <Card style={[styles.statsCard, styles.wideFinancialCard]}>
              <Card.Content>
                <Text style={styles.statValue}>{formatCurrency(stats.financial.totalRevenue)}</Text>
                <Text style={styles.statLabel}>Total Revenue</Text>
              </Card.Content>
            </Card>
            
            <Card style={[styles.statsCard, styles.wideFinancialCard]}>
              <Card.Content>
                <Text style={styles.statValue}>{formatCurrency(stats.financial.thisMonthRevenue)}</Text>
                <Text style={styles.statLabel}>This Month</Text>
              </Card.Content>
            </Card>
          </View>
          
          <Card style={styles.chartCard}>
            <Card.Content>
              <Text style={styles.chartTitle}>Month-over-Month Growth</Text>
              <View style={styles.growthComparisonContainer}>
                {stats.financial.monthlyRevenue.length >= 2 && (
                  <>
                    <View style={styles.growthComparisonItem}>
                      <MaterialIcons 
                        name={stats.financial.monthlyRevenue[5] > stats.financial.monthlyRevenue[4] ? "trending-up" : "trending-down"} 
                        size={36} 
                        color={stats.financial.monthlyRevenue[5] > stats.financial.monthlyRevenue[4] ? "#4CAF50" : "#F44336"} 
                      />
                      <Text style={styles.growthComparisonLabel}>Revenue Growth</Text>
                      <Text style={[
                        styles.growthComparisonValue,
                        {color: stats.financial.monthlyRevenue[5] > stats.financial.monthlyRevenue[4] ? "#4CAF50" : "#F44336"}
                      ]}>
                        {stats.financial.monthlyRevenue[4] > 0 
                          ? `${(((stats.financial.monthlyRevenue[5] - stats.financial.monthlyRevenue[4]) / stats.financial.monthlyRevenue[4]) * 100).toFixed(1)}%` 
                          : 'N/A'}
                      </Text>
                    </View>
                    
                    <View style={styles.growthDivider} />
                    
                    <View style={styles.growthComparisonItem}>
                      <Text style={styles.growthComparisonValueLarge}>
                        {formatCurrency(stats.financial.monthlyRevenue[5])}
                      </Text>
                      <Text style={styles.growthComparisonLabel}>Current Month</Text>
                    </View>
                    
                    <View style={styles.growthDivider} />
                    
                    <View style={styles.growthComparisonItem}>
                      <Text style={styles.growthComparisonValueLarge}>
                        {formatCurrency(stats.financial.monthlyRevenue[4])}
                      </Text>
                      <Text style={styles.growthComparisonLabel}>Previous Month</Text>
                    </View>
                  </>
                )}
                {stats.financial.monthlyRevenue.length < 2 && (
                  <Text style={styles.noDataText}>Not enough data for comparison</Text>
                )}
              </View>
            </Card.Content>
          </Card>
          
          <Card style={styles.chartCard}>
            <Card.Content>
              <Text style={styles.chartTitle}>Monthly Revenue (Last 6 Months)</Text>
              <View style={styles.chartContainer}>
                <BarChart
                  data={{
                    labels: getLastSixMonthsLabels(),
                    datasets: [
                      {
                        data: stats.financial.monthlyRevenue
                      }
                    ]
                  }}
                  width={screenWidth - 60}
                  height={220}
                  yAxisLabel="$"
                  verticalLabelRotation={0}
                  chartConfig={{
                    backgroundColor: '#FFFFFF',
                    backgroundGradientFrom: '#FFFFFF',
                    backgroundGradientTo: '#FFFFFF',
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    barPercentage: 0.7,
                  }}
                  style={{
                    marginVertical: 8,
                    borderRadius: 16,
                  }}
                />
              </View>
            </Card.Content>
          </Card>
          
          <Card style={styles.detailCard}>
            <Card.Content>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Avg. session price:</Text>
                <Text style={styles.detailValue}>{formatCurrency(stats.financial.averageSessionPrice)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Revenue per tutor:</Text>
                <Text style={styles.detailValue}>
                  {stats.users.tutors > 0 
                    ? formatCurrency(stats.financial.totalRevenue / stats.users.tutors) 
                    : '$0.00'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Revenue per student:</Text>
                <Text style={styles.detailValue}>
                  {stats.users.students > 0 
                    ? formatCurrency(stats.financial.totalRevenue / stats.users.students) 
                    : '$0.00'}
                </Text>
              </View>
            </Card.Content>
          </Card>
        </View>
        
        {/* Issues Stats Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="report-problem" size={24} color="#9C27B0" />
            <Text style={styles.sectionTitle}>Issue Tracking</Text>
          </View>
          
          <View style={styles.cardsContainer}>
            <Card style={styles.statsCard}>
              <Card.Content>
                <Text style={styles.statValue}>{stats.issues.total}</Text>
                <Text style={styles.statLabel}>Total Issues</Text>
              </Card.Content>
            </Card>
            
            <Card style={styles.statsCard}>
              <Card.Content>
                <Text style={[
                  styles.statValue, 
                  stats.issues.pending > 10 ? styles.negativeValue : null
                ]}>
                  {stats.issues.pending}
                </Text>
                <Text style={styles.statLabel}>Pending</Text>
              </Card.Content>
            </Card>
            
            <Card style={styles.statsCard}>
              <Card.Content>
                <Text style={styles.statValue}>{stats.issues.resolved}</Text>
                <Text style={styles.statLabel}>Resolved</Text>
              </Card.Content>
            </Card>
            
            <Card style={styles.statsCard}>
              <Card.Content>
                <Text style={styles.statValue}>
                  {stats.issues.total > 0 
                    ? `${((stats.issues.resolved / stats.issues.total) * 100).toFixed(0)}%` 
                    : '0%'}
                </Text>
                <Text style={styles.statLabel}>Resolution Rate</Text>
              </Card.Content>
            </Card>
          </View>
          
          <Card style={styles.chartCard}>
            <Card.Content>
              <Text style={styles.chartTitle}>Issue Resolution Status</Text>
              <View style={styles.chartContainer}>
                <ProgressChart
                  data={{
                    labels: ["Resolved", "Pending"],
                    data: [
                      stats.issues.total > 0 ? stats.issues.resolved / stats.issues.total : 0,
                      stats.issues.total > 0 ? stats.issues.pending / stats.issues.total : 0
                    ]
                  }}
                  width={screenWidth - 60}
                  height={220}
                  chartConfig={{
                    backgroundColor: '#FFFFFF',
                    backgroundGradientFrom: '#FFFFFF',
                    backgroundGradientTo: '#FFFFFF',
                    decimalPlaces: 1,
                    color: (opacity = 1) => `rgba(255, 69, 0, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    style: {
                      borderRadius: 16
                    },
                    strokeWidth: 2,
                  }}
                  hideLegend={false}
                  style={{
                    marginVertical: 8
                  }}
                />
              </View>
            </Card.Content>
          </Card>
          
          <Button 
            mode="contained" 
            icon="chevron-right" 
            onPress={() => navigation.navigate('Issues')}
            style={styles.actionButton}
          >
            Manage Reported Issues
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f7',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#f5f5f7',
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  cardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statsCard: {
    width: cardWidth,
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
  },
  wideFinancialCard: {
    width: '100%',
    marginBottom: 12,
  },
  wideCard: {
    width: '100%',
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
  },
  detailCard: {
    width: '100%',
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
  },
  chartCard: {
    width: '100%',
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    padding: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#9C27B0',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 8,
  },
  chartContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#fafafa',
    borderRadius: 12,
    marginTop: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  negativeValue: {
    color: '#F44336',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  popularSubjectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  subjectName: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  bookingsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookingsCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#9C27B0',
    marginRight: 4,
  },
  bookingsLabel: {
    fontSize: 14,
    color: '#666',
  },
  noDataText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
  actionButton: {
    marginTop: 8,
    backgroundColor: '#9C27B0',
  },
  ratioText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  growthComparisonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  growthComparisonItem: {
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
  },
  growthComparisonLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  growthComparisonValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
  growthComparisonValueLarge: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  growthDivider: {
    width: 1,
    height: 60,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 8,
  },
});

export default AnalyticsScreen; 