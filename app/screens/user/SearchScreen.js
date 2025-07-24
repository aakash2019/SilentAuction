// screens/user/SearchScreen.js
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView,
  TextInput,
  Image,
  FlatList
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../constants/Colors';

export default function SearchScreen() {
  const [searchText, setSearchText] = useState('Vintage');

  const recentSearches = [
    { id: 1, term: 'Antique Vase' },
    { id: 2, term: 'Signed Baseball' },
    { id: 3, term: 'Rare Coin' }
  ];

  const searchResults = [
    {
      id: 1,
      title: 'Vintage Rolex Submariner',
      currentBid: '$8,500',
      status: 'Ending Soon',
      statusColor: Colors.PRIMARY_GREEN,
      image: require('../../assets/icon.png'), // Placeholder image
    },
    {
      id: 2,
      title: 'Signed Babe Ruth Baseball',
      currentBid: '$2,200',
      status: 'New Listing',
      statusColor: Colors.TEXT_GRAY,
      image: require('../../assets/icon.png'), // Placeholder image
    },
    {
      id: 3,
      title: 'Rare 1921 Silver Dollar',
      currentBid: '$1,500',
      status: 'Popular Item',
      statusColor: Colors.TEXT_GRAY,
      image: require('../../assets/icon.png'), // Placeholder image
    }
  ];

  const handleClearSearch = () => {
    setSearchText('');
  };

  const handleRecentSearchPress = (term) => {
    setSearchText(term);
    console.log('Recent search pressed:', term);
  };

  const handleResultPress = (item) => {
    console.log('Result pressed:', item.title);
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
          <Text style={styles.resultTitle}>{item.title}</Text>
          <Text style={styles.resultBid}>Current Bid: {item.currentBid}</Text>
        </View>
        <View style={styles.resultImageContainer}>
          <Image source={item.image} style={styles.resultImage} />
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

        {/* Recent Searches */}
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

        {/* Results */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Results</Text>
          <FlatList
            data={searchResults}
            renderItem={renderResultItem}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
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
