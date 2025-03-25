import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

// Get tutor's income data
export const getTutorIncome = async (tutorId) => {
  try {
    // Get all completed sessions for the tutor
    const sessionsRef = collection(db, 'sessions');
    const completedSessionsQuery = query(
      sessionsRef,
      where('tutorId', '==', tutorId),
      where('status', '==', 'completed')
    );
    
    const querySnapshot = await getDocs(completedSessionsQuery);
    const sessions = [];
    
    querySnapshot.forEach((doc) => {
      sessions.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    
    // Calculate total income
    const totalIncome = sessions.reduce((sum, session) => sum + session.totalAmount, 0);
    
    // Group sessions by month for monthly income
    const monthlyIncome = {};
    sessions.forEach((session) => {
      const sessionDate = new Date(session.date);
      const monthYear = `${sessionDate.getFullYear()}-${sessionDate.getMonth() + 1}`;
      
      if (!monthlyIncome[monthYear]) {
        monthlyIncome[monthYear] = {
          month: sessionDate.toLocaleString('default', { month: 'long' }),
          year: sessionDate.getFullYear(),
          amount: 0,
          sessionCount: 0
        };
      }
      
      monthlyIncome[monthYear].amount += session.totalAmount;
      monthlyIncome[monthYear].sessionCount += 1;
    });
    
    // Convert to array and sort by date (newest first)
    const monthlyIncomeArray = Object.values(monthlyIncome).sort((a, b) => {
      return (b.year - a.year) || (b.month - a.month);
    });
    
    // Group sessions by subject
    const subjectIncome = {};
    sessions.forEach((session) => {
      if (!subjectIncome[session.subject]) {
        subjectIncome[session.subject] = {
          subject: session.subject,
          amount: 0,
          sessionCount: 0
        };
      }
      
      subjectIncome[session.subject].amount += session.totalAmount;
      subjectIncome[session.subject].sessionCount += 1;
    });
    
    // Convert to array and sort by amount
    const subjectIncomeArray = Object.values(subjectIncome).sort((a, b) => b.amount - a.amount);
    
    // Calculate upcoming income (from confirmed sessions)
    const upcomingSessionsQuery = query(
      sessionsRef,
      where('tutorId', '==', tutorId),
      where('status', '==', 'confirmed')
    );
    
    const upcomingSnapshot = await getDocs(upcomingSessionsQuery);
    const upcomingSessions = [];
    
    upcomingSnapshot.forEach((doc) => {
      upcomingSessions.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    
    const upcomingIncome = upcomingSessions.reduce((sum, session) => sum + session.totalAmount, 0);
    
    // Get total number of students
    const uniqueStudents = new Set(sessions.map(session => session.studentId));
    
    // Get income stats for current month
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    const currentMonthSessions = sessions.filter(session => {
      const sessionDate = new Date(session.date);
      return sessionDate.getMonth() === currentMonth && sessionDate.getFullYear() === currentYear;
    });
    
    const currentMonthIncome = currentMonthSessions.reduce((sum, session) => sum + session.totalAmount, 0);
    
    // Get income stats for previous month
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    
    const previousMonthSessions = sessions.filter(session => {
      const sessionDate = new Date(session.date);
      return sessionDate.getMonth() === previousMonth && sessionDate.getFullYear() === previousYear;
    });
    
    const previousMonthIncome = previousMonthSessions.reduce((sum, session) => sum + session.totalAmount, 0);
    
    // Calculate month-over-month change
    const monthlyGrowth = previousMonthIncome > 0 
      ? ((currentMonthIncome - previousMonthIncome) / previousMonthIncome) * 100 
      : 100;
    
    // Calculate recent sessions (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentSessions = sessions.filter(session => {
      const sessionDate = new Date(session.date);
      return sessionDate >= thirtyDaysAgo;
    });
    
    const recentIncome = recentSessions.reduce((sum, session) => sum + session.totalAmount, 0);
    
    return {
      success: true,
      totalIncome,
      monthlyIncome: monthlyIncomeArray,
      subjectIncome: subjectIncomeArray,
      upcomingIncome,
      uniqueStudentCount: uniqueStudents.size,
      currentMonthIncome,
      previousMonthIncome,
      monthlyGrowth,
      recentIncome,
      completedSessions: sessions
    };
  } catch (error) {
    console.error('Error getting tutor income:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}; 