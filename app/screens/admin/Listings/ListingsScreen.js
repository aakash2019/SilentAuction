// screens/admin/ListingsScreen.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView,
  Image,
  FlatList,
  ActivityIndicator,
  Alert
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../../constants/Colors';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase';
import Item from '../../../models/Item';

export default function ListingsScreen() {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('Active');
  const [activeItems, setActiveItems] = useState([]);
  const [soldItems, setSoldItems] = useState([]);
  const [expiredItems, setExpiredItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const tabs = ['Active', 'Sold', 'Expired'];

  // Fetch items from Firestore
  const fetchItems = async () => {
    setIsLoading(true);
    try {
      // Fetch active items
      const activeCollection = collection(db, 'listings', 'listings', 'active');
      const activeSnapshot = await getDocs(activeCollection);
      const activeItemsList = activeSnapshot.docs.map(doc => Item.fromFirestore(doc));
      setActiveItems(activeItemsList);

      // Fetch sold items
      const soldCollection = collection(db, 'listings', 'listings', 'sold');
      const soldSnapshot = await getDocs(soldCollection);
      const soldItemsList = soldSnapshot.docs.map(doc => Item.fromFirestore(doc));
      setSoldItems(soldItemsList);

      // Fetch expired items
      const expiredCollection = collection(db, 'listings', 'listings', 'expired');
      const expiredSnapshot = await getDocs(expiredCollection);
      const expiredItemsList = expiredSnapshot.docs.map(doc => Item.fromFirestore(doc));
      setExpiredItems(expiredItemsList);

    } catch (error) {
      console.error('Error fetching items:', error);
      Alert.alert('Error', 'Failed to load listings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch items when component mounts and when screen is focused
  useEffect(() => {
    fetchItems();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchItems();
    }, [])
  );

  // Get current items based on active tab
  const getCurrentItems = () => {
    switch (activeTab) {
      case 'Active':
        return activeItems;
      case 'Sold':
        return soldItems;
      case 'Expired':
        return expiredItems;
      default:
        return activeItems;
    }
  };

  const handleAddListing = () => {
    // Navigate to add listing screen
    navigation.navigate('AddItemScreen');
  };

  const handleListingPress = (item) => {
    // Navigate to listing details
    console.log('Listing pressed:', item.itemName);
    navigation.navigate('ItemScreen', { item });
  };

  const renderTabButton = (tab) => (
    <TouchableOpacity
      key={tab}
      style={[
        styles.tabButton,
        activeTab === tab && styles.activeTabButton
      ]}
      onPress={() => setActiveTab(tab)}
    >
      <Text style={[
        styles.tabButtonText,
        activeTab === tab && styles.activeTabButtonText
      ]}>
        {tab}
      </Text>
      <View style={styles.tabCount}>
        <Text style={[
          styles.tabCountText,
          activeTab === tab && styles.activeTabCountText
        ]}>
          {tab === 'Active' ? activeItems.length : 
           tab === 'Sold' ? soldItems.length : 
           expiredItems.length}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderListingItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.listingItem}
      onPress={() => handleListingPress(item)}
    >
      <View style={styles.imageContainer}>
        <Image 
          source={
            item.photos && item.photos.length > 0 
              ? { uri: item.photos[0] }
              : require('../../../assets/icon.png')
          } 
          style={styles.listingImage} 
        />
      </View>
      <View style={styles.listingContent}>
        <Text style={styles.listingTitle}>{item.itemName}</Text>
        <Text style={styles.category}>{item.category}</Text>
        <Text style={styles.startingBid}>Starting Bid: ${item.startingBid.toFixed(2)}</Text>
        <Text style={styles.totalBids}>{item.totalBids} bids</Text>
        {activeTab === 'Active' && (
          <Text style={styles.timeRemaining}>{item.getTimeRemaining()}</Text>
        )}
      </View>
      <View style={styles.statusContainer}>
        <View style={[
          styles.statusBadge,
          { backgroundColor: 
            activeTab === 'Active' ? Colors.PRIMARY_GREEN :
            activeTab === 'Sold' ? '#4CAF50' :
            '#FF9800'
          }
        ]}>
          <Text style={styles.statusText}>{activeTab}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons 
        name={
          activeTab === 'Active' ? 'time-outline' :
          activeTab === 'Sold' ? 'checkmark-circle-outline' :
          'close-circle-outline'
        } 
        size={64} 
        color={Colors.TEXT_GRAY} 
      />
      <Text style={styles.emptyStateTitle}>
        No {activeTab.toLowerCase()} listings
      </Text>
      <Text style={styles.emptyStateSubtitle}>
        {activeTab === 'Active' 
          ? 'Add new items to start auctions'
          : `No ${activeTab.toLowerCase()} items found`
        }
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {tabs.map(renderTabButton)}
      </View>

      {/* Loading State */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.PRIMARY_GREEN} />
          <Text style={styles.loadingText}>Loading listings...</Text>
        </View>
      ) : (
        <>
          {/* Listings List */}
          {getCurrentItems().length > 0 ? (
            <FlatList
              data={getCurrentItems()}
              renderItem={renderListingItem}
              keyExtractor={(item) => item.id.toString()}
              style={styles.listContainer}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              refreshing={isLoading}
              onRefresh={fetchItems}
            />
          ) : (
            renderEmptyState()
          )}
        </>
      )}

      {/* Floating Action Button - Only show for Active tab */}
      {activeTab === 'Active' && (
        <TouchableOpacity 
          style={styles.fab}
          onPress={handleAddListing}
        >
          <Ionicons name="add" size={24} color={Colors.WHITE} />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.BACKGROUND_WHITE,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.BACKGROUND_WHITE,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BACKGROUND_LIGHT_GRAY,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: Colors.BACKGROUND_LIGHT_GRAY,
  },
  activeTabButton: {
    backgroundColor: Colors.PRIMARY_GREEN,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.TEXT_BLACK,
    marginRight: 6,
  },
  activeTabButtonText: {
    color: Colors.WHITE,
  },
  tabCount: {
    backgroundColor: Colors.WHITE,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  tabCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.TEXT_BLACK,
  },
  activeTabCountText: {
    color: Colors.PRIMARY_GREEN,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.TEXT_GRAY,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 100, // Space for FAB
  },
  listingItem: {
    flexDirection: 'row',
    backgroundColor: Colors.BACKGROUND_WHITE,
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: Colors.TEXT_BLACK,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: Colors.BACKGROUND_LIGHT_GRAY,
    marginRight: 15,
    overflow: 'hidden',
  },
  listingImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  listingContent: {
    flex: 1,
    justifyContent: 'center',
  },
  listingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.TEXT_BLACK,
    marginBottom: 4,
  },
  category: {
    fontSize: 12,
    color: Colors.TEXT_GRAY,
    marginBottom: 2,
    textTransform: 'capitalize',
  },
  startingBid: {
    fontSize: 14,
    color: Colors.PRIMARY_GREEN,
    fontWeight: '600',
    marginBottom: 2,
  },
  totalBids: {
    fontSize: 12,
    color: Colors.TEXT_GRAY,
    marginBottom: 2,
  },
  timeRemaining: {
    fontSize: 12,
    color: Colors.TEXT_BLACK,
    fontWeight: '500',
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.WHITE,
    textTransform: 'uppercase',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.TEXT_BLACK,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: Colors.TEXT_GRAY,
    textAlign: 'center',
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.PRIMARY_GREEN,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.TEXT_BLACK,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
});
