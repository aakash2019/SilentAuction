// screens/user/SearchScreen.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView,
  TextInput,
  Image,
  FlatList,
  ActivityIndicator,
  Alert
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../constants/Colors';
import { useNavigation } from '@react-navigation/native';
import { getFirestore, collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';

export default function SearchScreen() {
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);

  const navigation = useNavigation();
  const db = getFirestore();

  // Search function to query Firebase
  const searchListings = async (searchTerm) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const activeListingsRef = collection(db, 'listings/listings/active');
      
      // Get all active listings and filter by itemName containing search term
      const querySnapshot = await getDocs(activeListingsRef);
      
      const results = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const itemName = data.itemName?.toLowerCase() || '';
        const category = data.category?.toLowerCase() || '';
        const description = data.description?.toLowerCase() || '';
        const searchLower = searchTerm.toLowerCase();
        
        // Check if search term matches itemName, category, or description
        if (itemName.includes(searchLower) || 
            category.includes(searchLower) || 
            description.includes(searchLower)) {
          
          // Calculate time remaining
          const timeRemaining = calculateTimeRemaining(data.expiresAt);
          const status = getItemStatus(data, timeRemaining);
          
          results.push({
            id: doc.id,
            itemName: data.itemName,
            topBidAmount: data.topBidAmount || data.startingBid,
            startingBid: data.startingBid,
            photos: data.photos,
            category: data.category,
            description: data.description,
            expiresAt: data.expiresAt,
            totalBids: data.totalBids || 0,
            status: status.text,
            statusColor: status.color,
            timeRemaining: timeRemaining
          });
        }
      });
      
      // Sort by time remaining (ending soon first)
      results.sort((a, b) => {
        if (a.timeRemaining.expired && !b.timeRemaining.expired) return 1;
        if (!a.timeRemaining.expired && b.timeRemaining.expired) return -1;
        if (!a.timeRemaining.expired && !b.timeRemaining.expired) {
          return (a.timeRemaining.totalMs || 0) - (b.timeRemaining.totalMs || 0);
        }
        return 0;
      });
      
      setSearchResults(results);
      
      // Add to recent searches if not already there
      if (searchTerm.trim() && !recentSearches.some(item => 
        item.term.toLowerCase() === searchTerm.toLowerCase())) {
        setRecentSearches(prev => [
          { id: Date.now(), term: searchTerm.trim() },
          ...prev.slice(0, 4) // Keep only 5 recent searches
        ]);
      }
      
    } catch (error) {
      Alert.alert('Error', 'Failed to search listings. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  // Calculate time remaining
  const calculateTimeRemaining = (expiresAt) => {
    if (!expiresAt) return { text: 'No expiry', expired: true, totalMs: 0 };

    try {
      const expiryDate = new Date(expiresAt);
      const now = new Date();
      const timeDiff = expiryDate.getTime() - now.getTime();

      if (timeDiff <= 0) {
        return { text: 'Expired', expired: true, totalMs: 0 };
      }

      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      if (days > 0) {
        return { text: `${days}d ${hours}h`, expired: false, totalMs: timeDiff };
      } else if (hours > 0) {
        return { text: `${hours}h`, expired: false, totalMs: timeDiff };
      } else {
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        return { text: `${minutes}m`, expired: false, totalMs: timeDiff };
      }
    } catch (error) {
      return { text: 'Unknown', expired: true, totalMs: 0 };
    }
  };

  // Get item status based on data and time remaining
  const getItemStatus = (data, timeRemaining) => {
    if (timeRemaining.expired) {
      return { text: 'Expired', color: '#FF6B6B' };
    }
    
    if (timeRemaining.totalMs < 3600000) { // Less than 1 hour
      return { text: 'Ending Soon', color: '#FF6B6B' };
    }
    
    if (timeRemaining.totalMs < 86400000) { // Less than 24 hours
      return { text: 'Ending Today', color: '#FFA500' };
    }
    
    if (data.totalBids > 5) {
      return { text: 'Popular', color: Colors.PRIMARY_GREEN };
    }
    
    if (data.totalBids === 0) {
      return { text: 'No Bids Yet', color: Colors.TEXT_GRAY };
    }
    
    return { text: 'Active', color: Colors.PRIMARY_GREEN };
  };

  // Format currency
  const formatCurrency = (amount) => {
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  // Debounced search effect
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchText.trim()) {
        searchListings(searchText);
      } else {
        setSearchResults([]);
      }
    }, 500); // 500ms delay

    return () => clearTimeout(delayedSearch);
  }, [searchText]);

  const handleClearSearch = () => {
    setSearchText('');
    setSearchResults([]);
  };

  const handleRecentSearchPress = (term) => {
    setSearchText(term);
    // Search will trigger automatically via useEffect
  };

  const handleResultPress = (item) => {
    // Navigate to UserItemScreen with the selected item
    navigation.navigate('UserItemScreen', { item });
  };

  const renderRecentSearchTag = ({ item }) => (
    <TouchableOpacity 
      style={styles.recentSearchTag}
      onPress={() => handleRecentSearchPress(item.term)}
    >
      <Text style={styles.recentSearchText}>{item.term}</Text>
    </TouchableOpacity>
  );

  const renderResultItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.resultItem}
      onPress={() => handleResultPress(item)}
    >
      <View style={styles.resultContent}>
        <View style={styles.resultTextContainer}>
          <Text style={[styles.resultStatus, { color: item.statusColor }]}>
            {item.status}
          </Text>
          <Text style={styles.resultTitle}>{item.itemName}</Text>
          <Text style={styles.resultBid}>
            Current Bid: {formatCurrency(item.topBidAmount)}
          </Text>
          <Text style={styles.resultCategory}>{item.category}</Text>
          {item.timeRemaining && !item.timeRemaining.expired && (
            <Text style={styles.resultTimeRemaining}>
              {item.timeRemaining.text} remaining
            </Text>
          )}
        </View>
        <View style={styles.resultImageContainer}>
          <Image 
            source={
              item.photos && item.photos.length > 0 
                ? { uri: item.photos[0] }
                : require('../../assets/icon.png')
            } 
            style={styles.resultImage} 
          />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons 
              name="search" 
              size={20} 
              color={Colors.TEXT_GRAY} 
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search auctions..."
              placeholderTextColor={Colors.TEXT_GRAY}
              value={searchText}
              onChangeText={setSearchText}
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={handleClearSearch}>
                <Ionicons 
                  name="close-circle" 
                  size={20} 
                  color={Colors.TEXT_GRAY} 
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Recent Searches - Only show if there are recent searches */}
        {recentSearches.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Searches</Text>
            <FlatList
              data={recentSearches}
              renderItem={renderRecentSearchTag}
              keyExtractor={(item) => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentSearchesContainer}
            />
          </View>
        )}

        {/* Results */}
        <View style={styles.section}>
          <View style={styles.resultsHeader}>
            <Text style={styles.sectionTitle}>
              {searchText.trim() ? `Results for "${searchText}"` : 'Search Results'}
            </Text>
            {isSearching && <ActivityIndicator size="small" color={Colors.PRIMARY_GREEN} />}
          </View>
          
          {searchText.trim() === '' ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={64} color={Colors.TEXT_GRAY} />
              <Text style={styles.emptyStateTitle}>Start Searching</Text>
              <Text style={styles.emptyStateSubtitle}>
                Enter a search term to find auction items
              </Text>
            </View>
          ) : searchResults.length === 0 && !isSearching ? (
            <View style={styles.emptyState}>
              <Ionicons name="sad-outline" size={64} color={Colors.TEXT_GRAY} />
              <Text style={styles.emptyStateTitle}>No Results Found</Text>
              <Text style={styles.emptyStateSubtitle}>
                Try different keywords or check your spelling
              </Text>
            </View>
          ) : (
            <FlatList
              data={searchResults}
              renderItem={renderResultItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          )}
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
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.BACKGROUND_LIGHT_GRAY,
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.TEXT_BLACK,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.TEXT_BLACK,
    marginBottom: 15,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.TEXT_BLACK,
    marginTop: 15,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: Colors.TEXT_GRAY,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  recentSearchesContainer: {
    paddingRight: 20,
  },
  recentSearchTag: {
    backgroundColor: Colors.BACKGROUND_LIGHT_GRAY,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  recentSearchText: {
    fontSize: 14,
    color: Colors.TEXT_BLACK,
    fontWeight: '500',
  },
  resultItem: {
    backgroundColor: Colors.BACKGROUND_WHITE,
    marginBottom: 15,
    paddingVertical: 15,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BACKGROUND_LIGHT_GRAY,
  },
  resultContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultTextContainer: {
    flex: 1,
    paddingRight: 15,
  },
  resultStatus: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.TEXT_BLACK,
    marginBottom: 4,
  },
  resultBid: {
    fontSize: 14,
    color: Colors.TEXT_GRAY,
    fontWeight: '400',
  },
  resultCategory: {
    fontSize: 12,
    color: Colors.PRIMARY_GREEN,
    fontWeight: '500',
    marginTop: 2,
  },
  resultTimeRemaining: {
    fontSize: 12,
    color: '#FFA500',
    fontWeight: '500',
    marginTop: 2,
  },
  resultImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: Colors.BACKGROUND_LIGHT_GRAY,
    overflow: 'hidden',
  },
  resultImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
});
