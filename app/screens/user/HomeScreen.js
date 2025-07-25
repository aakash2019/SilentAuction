// screens/user/HomeScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView,
  Image,
  FlatList,
  Dimensions,
  ActivityIndicator,
  Alert,
  Modal
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../constants/Colors';
import { db, auth } from '../../firebase';
import { collection, getDocs, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const navigation = useNavigation();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedPrice, setSelectedPrice] = useState('All');
  const [selectedEnding, setSelectedEnding] = useState('All');
  const [auctionItems, setAuctionItems] = useState([]);
  const [featuredItem, setFeaturedItem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filteredItems, setFilteredItems] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showEndingModal, setShowEndingModal] = useState(false);
  const [userName, setUserName] = useState('User');
  const categories = ['All', 'Electronics', 'Fashion', 'Home & Garden', 'Sports', 'Books', 
                    'Art & Collectibles', 'Jewelry', 'Automotive', 'Music', 'Other'];
  const priceRanges = ['All', '$0 - $50', '$50 - $100', '$100 - $250', '$250 - $500', '$500+'];
  const endingOptions = ['All', 'Ending Today', 'Ending This Week', 'Ending This Month'];

  // Fetch active listings from Firestore
  const fetchActiveListings = async () => {
    try {
      setIsLoading(true);
      
      const activeQuery = query(
        collection(db, 'listings/listings/active'),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(activeQuery);
      
      const items = [];

      querySnapshot.docs.forEach((docSnapshot) => {
        const itemData = { id: docSnapshot.id, ...docSnapshot.data() };
        
        // Use the data directly from the item document
        const currentBid = itemData.topBidAmount || itemData.startingBid || 0;
        const totalBidders = itemData.totalBids || 0;

        items.push({
          ...itemData,
          currentBid: currentBid,
          totalBidders: totalBidders,
          timeRemaining: calculateTimeRemaining(itemData.expiresAt)
        });
      });

      // Sort by current bid (highest first) to find featured item
      const sortedByBid = [...items].sort((a, b) => b.currentBid - a.currentBid);
      
      setAuctionItems(items);
      setFeaturedItem(sortedByBid[0] || null);
      setFilteredItems(items);
      
    } catch (error) {
      console.error('Error fetching listings:', error);
      Alert.alert('Error', 'Failed to load auction items. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTimeRemaining = (expiresAt) => {
    if (!expiresAt) return 'No expiry';

    try {
      const expiryDate = new Date(expiresAt);
      const now = new Date();
      const timeDiff = expiryDate.getTime() - now.getTime();

      if (timeDiff <= 0) return 'Expired';

      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      if (days > 0) return `${days} day${days !== 1 ? 's' : ''} left`;
      if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''} left`;
      return 'Less than 1 hour left';
    } catch (error) {
      return 'Unknown';
    }
  };

  const formatCurrency = (amount) => {
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  // Capitalize first letter of each word
  const capitalizeFirstLetter = (name) => {
    if (!name) return 'User';
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Fetch user data
  const fetchUserData = async (userId) => {
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const displayName = userData.fullName || userData.displayName || userData.name || 'User';
        const capitalizedName = capitalizeFirstLetter(displayName);
        setUserName(capitalizedName);
      } else {
        setUserName('User');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setUserName('User');
    }
  };

  useEffect(() => {
    // Initial fetch when component mounts
    fetchActiveListings();

    // Set up auth state listener to fetch user data
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchUserData(user.uid);
      } else {
        setUserName('User');
      }
    });

    return () => unsubscribe();
  }, []);

  // Set up timer to update time remaining every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setAuctionItems(prevItems => {
        if (prevItems.length > 0) {
          const updatedItems = prevItems.map(item => ({
            ...item,
            timeRemaining: calculateTimeRemaining(item.expiresAt)
          }));
          
          // Update featured item
          const sortedByBid = [...updatedItems].sort((a, b) => b.currentBid - a.currentBid);
          setFeaturedItem(sortedByBid[0] || null);
          
          return updatedItems;
        }
        return prevItems;
      });
    }, 60000); // Update every minute

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, []); // Empty dependency array

  // Fetch fresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchActiveListings();
      
      // Also fetch user data when screen focuses
      const currentUser = auth.currentUser;
      if (currentUser) {
        fetchUserData(currentUser.uid);
      }
    }, [])
  );

  // Apply filters whenever filter criteria change
  useEffect(() => {
    applyFilters();
  }, [selectedCategory, selectedPrice, selectedEnding, auctionItems]);

  const applyFilters = () => {
    let filtered = [...auctionItems];

    // Category filter
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    // Price filter
    if (selectedPrice !== 'All') {
      filtered = filtered.filter(item => {
        const price = item.currentBid;
        switch (selectedPrice) {
          case '$0 - $50':
            return price >= 0 && price <= 50;
          case '$50 - $100':
            return price > 50 && price <= 100;
          case '$100 - $250':
            return price > 100 && price <= 250;
          case '$250 - $500':
            return price > 250 && price <= 500;
          case '$500+':
            return price > 500;
          default:
            return true;
        }
      });
    }

    // Ending filter
    if (selectedEnding !== 'All') {
      filtered = filtered.filter(item => {
        if (!item.expiresAt) return false;
        
        const expiryDate = new Date(item.expiresAt);
        const now = new Date();
        const timeDiff = expiryDate.getTime() - now.getTime();
        const hoursLeft = timeDiff / (1000 * 60 * 60);
        const daysLeft = hoursLeft / 24;

        switch (selectedEnding) {
          case 'Ending Today':
            return hoursLeft <= 24 && hoursLeft > 0;
          case 'Ending This Week':
            return daysLeft <= 7 && daysLeft > 0;
          case 'Ending This Month':
            return daysLeft <= 30 && daysLeft > 0;
          default:
            return true;
        }
      });
    }

    setFilteredItems(filtered);
  };

  const handleSearch = () => {
    // Handle search functionality
  };

  const handleItemPress = (item) => {
    navigation.navigate('UserItemScreen', { item });
  };

  const handleFilterPress = (filterType) => {
    switch (filterType) {
      case 'Category':
        setShowCategoryModal(true);
        break;
      case 'Price':
        setShowPriceModal(true);
        break;
      case 'Ending':
        setShowEndingModal(true);
        break;
      default:
        // Handle other filter types
    }
  };

  const renderFilterModal = (visible, setVisible, options, selectedValue, setValue, title) => (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={() => setVisible(false)}>
              <Ionicons name="close" size={24} color={Colors.TEXT_BLACK} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.optionsList}>
            {options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.optionItem,
                  selectedValue === option && styles.selectedOption
                ]}
                onPress={() => {
                  setValue(option);
                  setVisible(false);
                }}
              >
                <Text style={[
                  styles.optionText,
                  selectedValue === option && styles.selectedOptionText
                ]}>
                  {option}
                </Text>
                {selectedValue === option && (
                  <Ionicons name="checkmark" size={20} color={Colors.PRIMARY_GREEN} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderFilterButton = (title, selectedValue, isSelected = false) => (
    <TouchableOpacity 
      style={[styles.filterButton, isSelected && styles.filterButtonSelected]}
      onPress={() => handleFilterPress(title)}
    >
      <Text style={[styles.filterText, isSelected && styles.filterTextSelected]}>
        {selectedValue === 'All' ? title : selectedValue}
      </Text>
      <Ionicons 
        name="chevron-down" 
        size={16} 
        color={isSelected ? Colors.WHITE : Colors.TEXT_GRAY} 
      />
    </TouchableOpacity>
  );

  const renderAuctionItem = ({ item }) => {
    const image = item.photos && item.photos.length > 0 
      ? { uri: item.photos[0] } 
      : require('../../assets/icon.png');

    return (
      <TouchableOpacity 
        style={styles.auctionItem}
        onPress={() => handleItemPress(item)}
      >
        <View style={styles.itemImageContainer}>
          <Image source={image} style={styles.itemImage} />
          {item.totalBidders > 0 && (
            <View style={styles.bidBadge}>
              <Text style={styles.bidBadgeText}>{item.totalBidders}</Text>
            </View>
          )}
        </View>
        <View style={styles.itemContent}>
          <Text style={styles.itemTitle}>{item.itemName}</Text>
          <Text style={styles.itemCategory}>{item.category}</Text>
          <Text style={styles.currentBid}>{formatCurrency(item.currentBid)}</Text>
          <Text style={styles.timeRemaining}>{item.timeRemaining}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.userName}>{userName}!</Text>
          </View>
          <TouchableOpacity style={styles.notificationIcon}>
            <Ionicons name="notifications-outline" size={24} color={Colors.DARK_BLUE} />
          </TouchableOpacity>
        </View>

        {/* Featured Item */}
        {featuredItem && (
          <View style={styles.featuredSection}>
            <Text style={styles.sectionTitle}>Featured Item</Text>
            <TouchableOpacity 
              style={styles.featuredItem}
              onPress={() => handleItemPress(featuredItem)}
            >
              <Image 
                source={featuredItem.photos && featuredItem.photos.length > 0 
                  ? { uri: featuredItem.photos[0] } 
                  : require('../../assets/icon.png')} 
                style={styles.featuredImage} 
              />
              <View style={styles.featuredOverlay}>
                <Text style={styles.featuredTitle}>{featuredItem.itemName}</Text>
                <Text style={styles.featuredBid}>{formatCurrency(featuredItem.currentBid)}</Text>
                <Text style={styles.featuredTime}>{featuredItem.timeRemaining}</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Filter Section */}
        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {renderFilterButton('Category', selectedCategory, selectedCategory !== 'All')}
            {renderFilterButton('Price', selectedPrice, selectedPrice !== 'All')}
            {renderFilterButton('Ending', selectedEnding, selectedEnding !== 'All')}
          </ScrollView>
        </View>

        {/* Auction Items */}
        <View style={styles.auctionSection}>
          <Text style={styles.sectionTitle}>Live Auctions</Text>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.PRIMARY_GREEN} />
              <Text style={styles.loadingText}>Loading auctions...</Text>
            </View>
          ) : filteredItems.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No auctions found</Text>
            </View>
          ) : (
            <FlatList
              data={filteredItems}
              renderItem={renderAuctionItem}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={styles.row}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>

      {/* Category Filter Modal */}
      <Modal
        visible={showCategoryModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Category</Text>
            {['All', 'Electronics', 'Art', 'Fashion', 'Home', 'Sports', 'Books', 'Other'].map((category) => (
              <TouchableOpacity
                key={category}
                style={styles.modalOption}
                onPress={() => {
                  setSelectedCategory(category);
                  setShowCategoryModal(false);
                }}
              >
                <Text style={[styles.modalOptionText, selectedCategory === category && styles.selectedOption]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowCategoryModal(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Price Filter Modal */}
      <Modal
        visible={showPriceModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPriceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Price Range</Text>
            {['All', '$0 - $50', '$50 - $100', '$100 - $250', '$250 - $500', '$500+'].map((price) => (
              <TouchableOpacity
                key={price}
                style={styles.modalOption}
                onPress={() => {
                  setSelectedPrice(price);
                  setShowPriceModal(false);
                }}
              >
                <Text style={[styles.modalOptionText, selectedPrice === price && styles.selectedOption]}>
                  {price}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowPriceModal(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Ending Filter Modal */}
      <Modal
        visible={showEndingModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEndingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Ending Time</Text>
            {['All', 'Ending Today', 'Ending This Week', 'Ending This Month'].map((ending) => (
              <TouchableOpacity
                key={ending}
                style={styles.modalOption}
                onPress={() => {
                  setSelectedEnding(ending);
                  setShowEndingModal(false);
                }}
              >
                <Text style={[styles.modalOptionText, selectedEnding === ending && styles.selectedOption]}>
                  {ending}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowEndingModal(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.BACKGROUND_WHITE,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  welcomeText: {
    fontSize: 16,
    color: Colors.TEXT_GRAY,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.TEXT_BLACK,
  },
  notificationIcon: {
    padding: 8,
  },
  featuredSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.TEXT_BLACK,
    marginBottom: 15,
  },
  featuredItem: {
    height: 200,
    borderRadius: 15,
    overflow: 'hidden',
    position: 'relative',
  },
  featuredImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  featuredOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 20,
  },
  featuredTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.WHITE,
    marginBottom: 5,
  },
  featuredBid: {
    fontSize: 16,
    color: Colors.PRIMARY_GREEN,
    fontWeight: '600',
  },
  featuredTime: {
    fontSize: 14,
    color: Colors.WHITE,
    marginTop: 5,
  },
  filterSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.BACKGROUND_LIGHT_GRAY,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
  },
  filterButtonSelected: {
    backgroundColor: Colors.PRIMARY_GREEN,
  },
  filterText: {
    fontSize: 14,
    color: Colors.TEXT_GRAY,
    marginRight: 5,
  },
  filterTextSelected: {
    color: Colors.WHITE,
  },
  auctionSection: {
    paddingHorizontal: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.TEXT_GRAY,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.TEXT_GRAY,
  },
  row: {
    justifyContent: 'space-between',
  },
  auctionItem: {
    width: '48%',
    backgroundColor: Colors.WHITE,
    borderRadius: 12,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  itemImageContainer: {
    position: 'relative',
  },
  itemImage: {
    width: '100%',
    height: 120,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    resizeMode: 'cover',
  },
  bidBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: Colors.PRIMARY_GREEN,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  bidBadgeText: {
    color: Colors.WHITE,
    fontSize: 10,
    fontWeight: 'bold',
  },
  itemContent: {
    padding: 12,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.TEXT_BLACK,
    marginBottom: 4,
  },
  itemCategory: {
    fontSize: 12,
    color: Colors.TEXT_GRAY,
    marginBottom: 8,
  },
  currentBid: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.PRIMARY_GREEN,
    marginBottom: 4,
  },
  timeRemaining: {
    fontSize: 12,
    color: Colors.TEXT_GRAY,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.WHITE,
    width: '80%',
    borderRadius: 15,
    padding: 20,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.TEXT_BLACK,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalOption: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BACKGROUND_LIGHT_GRAY,
  },
  modalOptionText: {
    fontSize: 16,
    color: Colors.TEXT_BLACK,
  },
  selectedOption: {
    color: Colors.PRIMARY_GREEN,
    fontWeight: '600',
  },
  modalCloseButton: {
    marginTop: 20,
    paddingVertical: 12,
    backgroundColor: Colors.BACKGROUND_LIGHT_GRAY,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    color: Colors.TEXT_BLACK,
  },
});

// Export statement is already at the top of the function declaration