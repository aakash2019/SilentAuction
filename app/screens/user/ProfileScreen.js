import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Image, FlatList } from 'react-native';
import React, { useEffect, useState } from 'react';
import { auth } from '../../firebase';
import { signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../constants/Colors';

export default function ProfileScreen({}) {
  const [userName, setUserName] = useState('');
  const [activeTab, setActiveTab] = useState('items');
  const db = getFirestore();

  const navigation = useNavigation();

  const userStats = {
    bids: 12,
    items: 3,
    following: 2
  };

  const userItems = [
    {
      id: 1,
      title: 'Vintage Camera',
      currentBid: '$150',
      image: require('../../assets/icon.png'), // Placeholder image
    },
    {
      id: 2,
      title: 'Signed Book',
      currentBid: '$200',
      image: require('../../assets/icon.png'), // Placeholder image
    },
    {
      id: 3,
      title: 'Art Print',
      currentBid: '$50',
      image: require('../../assets/icon.png'), // Placeholder image
    }
  ];
  

  useEffect(() => {
    const fetchUserName = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserName(userDoc.data().fullName || 'No Name');
        } else {
          setUserName('No Name');
        }
      }
    };
    fetchUserName();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigation.reset({
        index: 0,
        routes: [{ name: 'LoginScreen' }],
      });
    } catch (error) {
      alert('Logout failed!');
    }
  };

  const handleTabPress = (tab) => {
    setActiveTab(tab);
  };

  const handleItemPress = (item) => {
    console.log('Item pressed:', item.title);
  };

  const renderStatCard = (number, label) => (
    <View style={styles.statCard}>
      <Text style={styles.statNumber}>{number}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.itemCard}
      onPress={() => handleItemPress(item)}
    >
      <View style={styles.itemImageContainer}>
        <Image source={item.image} style={styles.itemImage} />
      </View>
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle}>{item.title}</Text>
        <Text style={styles.itemBid}>Current Bid: {item.currentBid}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Profile</Text>
        </View>

        {/* Profile Info */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Image 
              source={require('../../assets/icon.png')} 
              style={styles.avatar}
            />
          </View>
          <Text style={styles.userName}>Sophia Carter</Text>
          <Text style={styles.userHandle}>@sophia_c</Text>
          <Text style={styles.joinedDate}>Joined 2021</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          {renderStatCard(userStats.bids, 'Bids')}
          {renderStatCard(userStats.items, 'Items')}
          {renderStatCard(userStats.following, 'Following')}
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'bids' && styles.activeTab]}
            onPress={() => handleTabPress('bids')}
          >
            <Text style={[styles.tabText, activeTab === 'bids' && styles.activeTabText]}>
              Bids
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'items' && styles.activeTab]}
            onPress={() => handleTabPress('items')}
          >
            <Text style={[styles.tabText, activeTab === 'items' && styles.activeTabText]}>
              Items
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'settings' && styles.activeTab]}
            onPress={() => handleTabPress('settings')}
          >
            <Text style={[styles.tabText, activeTab === 'settings' && styles.activeTabText]}>
              Settings
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.contentContainer}>
          {activeTab === 'items' && (
            <FlatList
              data={userItems}
              renderItem={renderItem}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          )}
          {activeTab === 'bids' && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Your bids will appear here</Text>
            </View>
          )}
          {activeTab === 'settings' && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Settings options will appear here</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sign Out Button */}
      <View style={styles.signOutContainer}>
        <TouchableOpacity style={styles.signOutButton} onPress={handleLogout}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
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
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFD4B3',
    marginBottom: 15,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  userName: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.TEXT_BLACK,
    marginBottom: 4,
  },
  userHandle: {
    fontSize: 16,
    color: Colors.TEXT_GRAY,
    marginBottom: 4,
  },
  joinedDate: {
    fontSize: 14,
    color: Colors.TEXT_GRAY,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  statCard: {
    alignItems: 'center',
    backgroundColor: Colors.BACKGROUND_WHITE,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.BACKGROUND_LIGHT_GRAY,
    minWidth: 80,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.TEXT_BLACK,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: Colors.TEXT_GRAY,
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
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: Colors.BACKGROUND_WHITE,
    paddingVertical: 15,
    paddingHorizontal: 5,
    marginBottom: 15,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.BACKGROUND_LIGHT_GRAY,
  },
  itemImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: Colors.BACKGROUND_LIGHT_GRAY,
    marginRight: 15,
    overflow: 'hidden',
  },
  itemImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  itemContent: {
    flex: 1,
    justifyContent: 'center',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.TEXT_BLACK,
    marginBottom: 4,
  },
  itemBid: {
    fontSize: 14,
    color: Colors.TEXT_GRAY,
    fontWeight: '400',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.TEXT_GRAY,
  },
  signOutContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: Colors.BACKGROUND_WHITE,
  },
  signOutButton: {
    backgroundColor: Colors.PRIMARY_GREEN,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: {
    color: Colors.WHITE,
    fontSize: 16,
    fontWeight: '600',
  },
});
