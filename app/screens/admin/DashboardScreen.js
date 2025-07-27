// screens/admin/DashboardScreen.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView,
  ActivityIndicator,
  ImageBackground
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../constants/Colors';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

export default function DashboardScreen() {
  const navigation = useNavigation();
  const [statsData, setStatsData] = useState([
    { title: 'Active Listings', value: '0', id: 1, loading: true },
    { title: 'Sold Items', value: '0', id: 2, loading: true },
    { title: 'Expired Items', value: '0', id: 3, loading: true }
  ]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchDashboardData();
    }, [])
  );

  const fetchDashboardData = async () => {
    try {
      
      // Reset loading state
      setStatsData([
        { title: 'Active Listings', value: '0', id: 1, loading: true },
        { title: 'Sold Items', value: '0', id: 2, loading: true },
        { title: 'Expired Items', value: '0', id: 3, loading: true }
      ]);

      // Fetch active listings count
      const activeListingsPromise = fetchActiveListings();
      
      // Fetch sold items count
      const soldItemsPromise = fetchSoldItems();

      // Fetch expired items count
      const expiredItemsPromise = fetchExpiredItems();

      const [activeCount, soldCount, expiredCount] = await Promise.all([
        activeListingsPromise,
        soldItemsPromise,
        expiredItemsPromise
      ]);

      setStatsData([
        { title: 'Active Listings', value: activeCount.toString(), id: 1, loading: false },
        { title: 'Sold Items', value: soldCount.toString(), id: 2, loading: false },
        { title: 'Expired Items', value: expiredCount.toString(), id: 3, loading: false }
      ]);

    } catch (error) {
      // Set error state or keep loading state
      setStatsData(prev => prev.map(stat => ({ ...stat, loading: false, value: 'Error' })));
    }
  };

  const fetchActiveListings = async () => {
    try {
      const activeCollection = collection(db, 'listings', 'listings', 'active');
      const activeSnapshot = await getDocs(activeCollection);
      
      // Log active items to debug
      activeSnapshot.forEach((doc) => {
        
      });
      
      return activeSnapshot.size;
    } catch (error) {
      return 0;
    }
  };

  const fetchSoldItems = async () => {
    try {
      const soldCollection = collection(db, 'listings', 'listings', 'sold');
      const soldSnapshot = await getDocs(soldCollection);
      
      // Log sold items to debug
      soldSnapshot.forEach((doc) => {
        
      });
      
      return soldSnapshot.size;
    } catch (error) {
      return 0;
    }
  };

  const fetchExpiredItems = async () => {
    try {
      const expiredCollection = collection(db, 'listings', 'listings', 'expired');
      const expiredSnapshot = await getDocs(expiredCollection);
      
      // Log expired items to debug
      expiredSnapshot.forEach((doc) => {
        
      });
      
      return expiredSnapshot.size;
    } catch (error) {
      return 0;
    }
  };

  const getCardBackgroundImage = (statId) => {
    switch (statId) {
      case 1: // Active Listings
        return require('../../assets/items/active.jpg');
      case 2: // Sold Items
        return require('../../assets/items/sold.jpg');
      case 3: // Expired Items
        return require('../../assets/items/expired.jpg');
      default:
        return null;
    }
  };

  const handleStatCardPress = (statId) => {
    switch (statId) {
      case 1: // Active Listings
        navigation.navigate('Listings', { initialTab: 'Active' });
        break;
      case 2: // Sold Items
        navigation.navigate('Listings', { initialTab: 'Sold' });
        break;
      case 3: // Expired Items
        navigation.navigate('Listings', { initialTab: 'Expired' });
        break;
      default:
        break;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        

        {/* Statistics Cards */}
        <View style={styles.statsContainer}>
          {statsData.map((stat) => (
            <TouchableOpacity 
              key={stat.id} 
              style={[
                styles.statCardContainer,
                stat.id === 3 ? styles.fullWidthCard : styles.halfWidthCard
              ]}
              onPress={() => handleStatCardPress(stat.id)}
              disabled={stat.loading}
            >
              <ImageBackground
                source={getCardBackgroundImage(stat.id)}
                style={styles.statCard}
                imageStyle={styles.cardBackgroundImage}
              >
                <View style={styles.cardOverlay}>
                  <Text style={styles.statTitle}>{stat.title}</Text>
                  {stat.loading ? (
                    <ActivityIndicator size="large" color={Colors.BACKGROUND_WHITE} style={styles.statLoader} />
                  ) : (
                    <Text style={styles.statValue}>{stat.value}</Text>
                  )}
                  {!stat.loading && (
                    <Ionicons 
                      name="chevron-forward" 
                      size={16} 
                      color={Colors.BACKGROUND_WHITE} 
                      style={styles.statArrow}
                    />
                  )}
                </View>
              </ImageBackground>
            </TouchableOpacity>
          ))}
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
  statCardContainer: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: Colors.TEXT_BLACK,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  statCard: {
    minHeight: 120,
    justifyContent: 'center',
  },
  cardBackgroundImage: {
    borderRadius: 12,
    opacity: 0.8,
  },
  cardOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    padding: 20,
    borderRadius: 12,
    position: 'relative',
    minHeight: 120,
    justifyContent: 'center',
  },
  halfWidthCard: {
    width: '48%',
  },
  fullWidthCard: {
    width: '100%',
  },
  statTitle: {
    fontSize: 14,
    color: Colors.BACKGROUND_WHITE,
    marginBottom: 8,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.BACKGROUND_WHITE,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  statLoader: {
    marginTop: 8,
  },
  statArrow: {
    position: 'absolute',
    top: 15,
    right: 15,
  },
});
