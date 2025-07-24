// screens/user/HomeScreen.js
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView,
  Image,
  FlatList,
  Dimensions
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../constants/Colors';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedPrice, setSelectedPrice] = useState('All');
  const [selectedEnding, setSelectedEnding] = useState('All');

  const featuredItem = {
    id: 'featured',
    title: 'Signed Acoustic Guitar',
    image: require('../../assets/icon.png'), // Placeholder image
    category: 'Music',
    currentBid: '$450',
    endingTime: '2 days left'
  };

  const auctionItems = [
    {
      id: 1,
      title: 'Vintage Camera',
      category: 'Photography',
      image: require('../../assets/icon.png'), // Placeholder image
      currentBid: '$125',
      endingTime: '1 day left'
    },
    {
      id: 2,
      title: 'Handmade Scarf',
      category: 'Fashion',
      image: require('../../assets/icon.png'), // Placeholder image
      currentBid: '$45',
      endingTime: '3 hours left'
    },
    {
      id: 3,
      title: 'Signed Baseball',
      category: 'Sports',
      image: require('../../assets/icon.png'), // Placeholder image
      currentBid: '$89',
      endingTime: '5 hours left'
    },
    {
      id: 4,
      title: 'Antique Clock',
      category: 'Collectibles',
      image: require('../../assets/icon.png'), // Placeholder image
      currentBid: '$200',
      endingTime: '1 day left'
    },
    {
      id: 5,
      title: 'Artisan Pottery',
      category: 'Home Decor',
      image: require('../../assets/icon.png'), // Placeholder image
      currentBid: '$75',
      endingTime: '6 hours left'
    },
    {
      id: 6,
      title: 'Luxury Watch',
      category: 'Accessories',
      image: require('../../assets/icon.png'), // Placeholder image
      currentBid: '$350',
      endingTime: '2 days left'
    }
  ];

  const handleSearch = () => {
    console.log('Search pressed');
  };

  const handleItemPress = (item) => {
    console.log('Item pressed:', item.title);
  };

  const handleFilterPress = (filterType) => {
    console.log('Filter pressed:', filterType);
  };

  const renderFilterButton = (title, isSelected = false) => (
    <TouchableOpacity 
      style={[styles.filterButton, isSelected && styles.filterButtonSelected]}
      onPress={() => handleFilterPress(title)}
    >
      <Text style={[styles.filterText, isSelected && styles.filterTextSelected]}>
        {title}
      </Text>
      <Ionicons 
        name="chevron-down" 
        size={16} 
        color={isSelected ? Colors.PRIMARY_GREEN : Colors.TEXT_GRAY} 
      />
    </TouchableOpacity>
  );

  const renderAuctionItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.auctionItem}
      onPress={() => handleItemPress(item)}
    >
      <View style={styles.itemImageContainer}>
        <Image source={item.image} style={styles.itemImage} />
      </View>
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle}>{item.title}</Text>
        <Text style={styles.itemCategory}>{item.category}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Featured Item */}
        <TouchableOpacity 
          style={styles.featuredItem}
          onPress={() => handleItemPress(featuredItem)}
        >
          <Image source={featuredItem.image} style={styles.featuredImage} />
          <View style={styles.featuredOverlay}>
            <Text style={styles.featuredTitle}>{featuredItem.title}</Text>
            <Text style={styles.featuredCategory}>{featuredItem.category}</Text>
          </View>
        </TouchableOpacity>

        {/* Filters */}
        <View style={styles.filtersContainer}>
          {renderFilterButton('Category')}
          {renderFilterButton('Price')}
          {renderFilterButton('Ending Soon')}
        </View>

        {/* Auction Items Grid */}
        <View style={styles.gridContainer}>
          <FlatList
            data={auctionItems}
            renderItem={renderAuctionItem}
            keyExtractor={(item) => item.id.toString()}
            numColumns={2}
            columnWrapperStyle={styles.gridRow}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: Colors.BACKGROUND_WHITE,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BACKGROUND_LIGHT_GRAY,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.TEXT_BLACK,
  },
  scrollView: {
    flex: 1,
  },
  featuredItem: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: Colors.BACKGROUND_LIGHT_GRAY,
    height: 200,
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  featuredTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.WHITE,
    marginBottom: 4,
  },
  featuredCategory: {
    fontSize: 14,
    color: Colors.WHITE,
    opacity: 0.9,
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    justifyContent: 'space-between',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.BACKGROUND_LIGHT_GRAY,
  },
  filterButtonSelected: {
    backgroundColor: Colors.PRIMARY_GREEN,
  },
  filterText: {
    fontSize: 14,
    color: Colors.TEXT_GRAY,
    marginRight: 4,
    fontWeight: '500',
  },
  filterTextSelected: {
    color: Colors.WHITE,
  },
  gridContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  gridRow: {
    justifyContent: 'space-between',
  },
  auctionItem: {
    width: (width - 60) / 2,
    backgroundColor: Colors.BACKGROUND_WHITE,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: Colors.TEXT_BLACK,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemImageContainer: {
    width: '100%',
    height: 120,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.BACKGROUND_LIGHT_GRAY,
  },
  itemImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
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
    fontWeight: '400',
  },
});
