// screens/user/BidScreen.js
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView,
  Image,
  FlatList
} from 'react-native';
import { Colors } from '../../constants/Colors';

export default function BidScreen() {
  const [activeTab, setActiveTab] = useState('active');

  const activeBids = [
    {
      id: 1,
      title: 'Vintage Camera',
      currentBid: '$150',
      image: require('../../assets/icon.png'), // Placeholder image
      status: 'active'
    },
    {
      id: 2,
      title: 'Signed Baseball',
      currentBid: '$200',
      image: require('../../assets/icon.png'), // Placeholder image
      status: 'active'
    },
    {
      id: 3,
      title: 'Antique Clock',
      currentBid: '$100',
      image: require('../../assets/icon.png'), // Placeholder image
      status: 'active'
    },
    {
      id: 4,
      title: 'Diamond Ring',
      currentBid: '$300',
      image: require('../../assets/icon.png'), // Placeholder image
      status: 'active'
    },
    {
      id: 5,
      title: 'Painting',
      currentBid: '$50',
      image: require('../../assets/icon.png'), // Placeholder image
      status: 'active'
    }
  ];

  const pastBids = [
    {
      id: 6,
      title: 'Vintage Watch',
      currentBid: '$450',
      image: require('../../assets/icon.png'), // Placeholder image
      status: 'won'
    },
    {
      id: 7,
      title: 'Art Sculpture',
      currentBid: '$180',
      image: require('../../assets/icon.png'), // Placeholder image
      status: 'lost'
    }
  ];

  const handleTabPress = (tab) => {
    setActiveTab(tab);
  };

  const handleBidPress = (item) => {
    console.log('Bid pressed:', item.title);
  };

  const renderBidItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.bidItem}
      onPress={() => handleBidPress(item)}
    >
      <View style={styles.bidImageContainer}>
        <Image source={item.image} style={styles.bidImage} />
      </View>
      <View style={styles.bidContent}>
        <Text style={styles.bidTitle}>{item.title}</Text>
        <Text style={styles.bidAmount}>Current Bid: {item.currentBid}</Text>
      </View>
    </TouchableOpacity>
  );

  const currentData = activeTab === 'active' ? activeBids : pastBids;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.title}>My Bids</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'active' && styles.activeTab]}
          onPress={() => handleTabPress('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>
            Active Bids
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'past' && styles.activeTab]}
          onPress={() => handleTabPress('past')}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>
            Past Bids
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bids List */}
      <FlatList
        data={currentData}
        renderItem={renderBidItem}
        keyExtractor={(item) => item.id.toString()}
        style={styles.listContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.BACKGROUND_WHITE,
  },
  titleContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.TEXT_BLACK,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: Colors.BACKGROUND_LIGHT_GRAY,
  },
  activeTab: {
    borderBottomColor: Colors.PRIMARY_GREEN,
  },
  tabText: {
    fontSize: 16,
    color: Colors.TEXT_GRAY,
    fontWeight: '500',
  },
  activeTabText: {
    color: Colors.TEXT_BLACK,
    fontWeight: '600',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
  },
  bidItem: {
    flexDirection: 'row',
    backgroundColor: Colors.BACKGROUND_WHITE,
    paddingVertical: 15,
    paddingHorizontal: 5,
    marginBottom: 15,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.BACKGROUND_LIGHT_GRAY,
  },
  bidImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: Colors.BACKGROUND_LIGHT_GRAY,
    marginRight: 15,
    overflow: 'hidden',
  },
  bidImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  bidContent: {
    flex: 1,
    justifyContent: 'center',
  },
  bidTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.TEXT_BLACK,
    marginBottom: 4,
  },
  bidAmount: {
    fontSize: 14,
    color: Colors.TEXT_GRAY,
    fontWeight: '400',
  },
});
