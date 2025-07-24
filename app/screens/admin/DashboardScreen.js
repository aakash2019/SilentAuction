// screens/admin/DashboardScreen.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../constants/Colors';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useFocusEffect } from '@react-navigation/native';

export default function DashboardScreen() {
  const [statsData, setStatsData] = useState([
    { title: 'Active Listings', value: '0', id: 1, loading: true },
    { title: 'New Users', value: '0', id: 2, loading: true },
    { title: 'Sold Items', value: '0', id: 3, loading: true }
  ]);

  const quickActions = [
    { title: 'Modify Listing', icon: 'create-outline', id: 1 },
    { title: 'Delete Listing', icon: 'trash-outline', id: 2 },
    { title: 'Block User', icon: 'person-remove-outline', id: 3 },
    { title: 'Confirm Bid', icon: 'checkmark-circle-outline', id: 4 }
  ];

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('Dashboard screen focused - refreshing data...');
      fetchDashboardData();
    }, [])
  );

  const fetchDashboardData = async () => {
    try {
      console.log('Refreshing dashboard data...');
      
      // Reset loading state
      setStatsData([
        { title: 'Active Listings', value: '0', id: 1, loading: true },
        { title: 'New Users', value: '0', id: 2, loading: true },
        { title: 'Sold Items', value: '0', id: 3, loading: true }
      ]);

      // Fetch active listings count
      const activeListingsPromise = fetchActiveListings();
      
      // Fetch new users count (created within 2 days)
      const newUsersPromise = fetchNewUsers();
      
      // Fetch sold items count
      const soldItemsPromise = fetchSoldItems();

      const [activeCount, newUsersCount, soldCount] = await Promise.all([
        activeListingsPromise,
        newUsersPromise,
        soldItemsPromise
      ]);

      console.log('Dashboard data fetched:', { activeCount, newUsersCount, soldCount });

      setStatsData([
        { title: 'Active Listings', value: activeCount.toString(), id: 1, loading: false },
        { title: 'New Users', value: newUsersCount.toString(), id: 2, loading: false },
        { title: 'Sold Items', value: soldCount.toString(), id: 3, loading: false }
      ]);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Set error state or keep loading state
      setStatsData(prev => prev.map(stat => ({ ...stat, loading: false, value: 'Error' })));
    }
  };

  const fetchActiveListings = async () => {
    try {
      console.log('Fetching active listings...');
      const activeCollection = collection(db, 'listings', 'listings', 'active');
      const activeSnapshot = await getDocs(activeCollection);
      console.log('Active listings count:', activeSnapshot.size);
      
      // Log active items to debug
      activeSnapshot.forEach((doc) => {
        console.log('Active item:', { id: doc.id, ...doc.data() });
      });
      
      return activeSnapshot.size;
    } catch (error) {
      console.error('Error fetching active listings:', error);
      return 0;
    }
  };

  const fetchNewUsers = async () => {
    try {
      // Calculate date 2 days ago
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const twoDaysAgoISO = twoDaysAgo.toISOString();
      const twoDaysAgoTimestamp = Timestamp.fromDate(twoDaysAgo);

      console.log('Searching for users created after:', twoDaysAgoISO);

      // Get all users first to check the data structure
      const usersCollection = collection(db, 'users');
      const allUsersSnapshot = await getDocs(usersCollection);
      
      console.log('Total users in database:', allUsersSnapshot.size);
      
      // Log first few users to see data structure
      let newUsersCount = 0;
      allUsersSnapshot.forEach((doc) => {
        const userData = doc.data();
        console.log('User data:', { id: doc.id, ...userData });
        
        // Check if user was created within last 2 days
        let userCreatedAt = null;
        
        if (userData.createdAt) {
          // Handle Firestore Timestamp
          if (userData.createdAt.toDate) {
            userCreatedAt = userData.createdAt.toDate();
          }
          // Handle ISO string
          else if (typeof userData.createdAt === 'string') {
            userCreatedAt = new Date(userData.createdAt);
          }
          // Handle JavaScript Date
          else if (userData.createdAt instanceof Date) {
            userCreatedAt = userData.createdAt;
          }
          
          if (userCreatedAt && userCreatedAt >= twoDaysAgo) {
            newUsersCount++;
            console.log('Found new user:', doc.id, 'created at:', userCreatedAt);
          }
        }
      });

      console.log('New users count:', newUsersCount);
      return newUsersCount;
    } catch (error) {
      console.error('Error fetching new users:', error);
      return 0;
    }
  };

  const fetchSoldItems = async () => {
    try {
      console.log('Fetching sold items...');
      const soldCollection = collection(db, 'listings', 'listings', 'sold');
      const soldSnapshot = await getDocs(soldCollection);
      console.log('Sold items count:', soldSnapshot.size);
      
      // Log sold items to debug
      soldSnapshot.forEach((doc) => {
        console.log('Sold item:', { id: doc.id, ...doc.data() });
      });
      
      return soldSnapshot.size;
    } catch (error) {
      console.error('Error fetching sold items:', error);
      return 0;
    }
  };

  const handleQuickAction = (actionId) => {
    // Handle quick action based on actionId
    console.log('Quick action pressed:', actionId);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        

        {/* Statistics Cards */}
        <View style={styles.statsContainer}>
          {statsData.map((stat) => (
            <View key={stat.id} style={[
              styles.statCard,
              stat.id === 3 ? styles.fullWidthCard : styles.halfWidthCard
            ]}>
              <Text style={styles.statTitle}>{stat.title}</Text>
              {stat.loading ? (
                <ActivityIndicator size="large" color={Colors.PRIMARY_GREEN} style={styles.statLoader} />
              ) : (
                <Text style={styles.statValue}>{stat.value}</Text>
              )}
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <View style={styles.actionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.actionButton}
                onPress={() => handleQuickAction(action.id)}
              >
                <Ionicons 
                  name={action.icon} 
                  size={24} 
                  color={Colors.TEXT_BLACK} 
                  style={styles.actionIcon}
                />
                <Text style={styles.actionText}>{action.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.BACKGROUND_WHITE,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: Colors.BACKGROUND_WHITE,
  },
  menuButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.TEXT_BLACK,
  },
  placeholder: {
    width: 34, // Same width as menu button to center title
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
    marginTop: 10,
  },
  statCard: {
    backgroundColor: Colors.BACKGROUND_LIGHT_GRAY,
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
  },
  halfWidthCard: {
    width: '48%',
  },
  fullWidthCard: {
    width: '100%',
  },
  statTitle: {
    fontSize: 14,
    color: Colors.TEXT_GRAY,
    marginBottom: 8,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.TEXT_BLACK,
  },
  statLoader: {
    marginTop: 8,
  },
  quickActionsContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.TEXT_BLACK,
    marginBottom: 20,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    width: '48%',
    backgroundColor: Colors.BACKGROUND_WHITE,
    borderRadius: 12,
    padding: 16,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: Colors.BACKGROUND_LIGHT_GRAY,
    shadowColor: Colors.TEXT_BLACK,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  actionIcon: {
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.TEXT_BLACK,
  },
});
