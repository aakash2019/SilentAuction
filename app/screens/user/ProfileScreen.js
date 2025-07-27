import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Image, FlatList, ActivityIndicator, Alert, Modal } from 'react-native';
import React, { useEffect, useState } from 'react';
import { auth } from '../../firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { getStorage, ref, listAll, getDownloadURL } from 'firebase/storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Colors } from '../../constants/Colors';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function ProfileScreen({}) {
  const [userData, setUserData] = useState(null);
  const [activeTab, setActiveTab] = useState('bids');
  const [userItems, setUserItems] = useState([]);
  const [userBids, setUserBids] = useState([]);
  const [userWonItems, setUserWonItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false); // Start with false
  const [currentUserId, setCurrentUserId] = useState(null);
  const [showProfilePicModal, setShowProfilePicModal] = useState(false);
  const [availableProfilePics, setAvailableProfilePics] = useState([]);
  const [isLoadingProfilePics, setIsLoadingProfilePics] = useState(false);
  const [isUpdatingProfilePic, setIsUpdatingProfilePic] = useState(false);
  const [selectedProfilePic, setSelectedProfilePic] = useState(null);
  const [profilePicsCache, setProfilePicsCache] = useState([]);
  const [isCacheLoaded, setIsCacheLoaded] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const db = getFirestore();
  const storage = getStorage();

  const navigation = useNavigation();

  // Pre-load profile pictures in background (cache them)
  const preLoadProfilePics = async () => {
    if (isCacheLoaded) return; // Don't reload if already cached
    
    try {
      const usersRef = ref(storage, 'users');
      const result = await listAll(usersRef);
      
      const profilePicUrls = [];
      for (const itemRef of result.items) {
        const downloadURL = await getDownloadURL(itemRef);
        profilePicUrls.push({
          id: itemRef.name,
          url: downloadURL,
          name: itemRef.name
        });
      }
      
      setProfilePicsCache(profilePicUrls);
      setIsCacheLoaded(true);
    } catch (error) {
    }
  };

  // Fast fetch - use cache if available, otherwise load
  const fetchAvailableProfilePics = async () => {
    if (isCacheLoaded) {
      // Use cached data - instant loading!
      setAvailableProfilePics(profilePicsCache);
      return;
    }
    
    // If not cached, show loading and fetch
    try {
      setIsLoadingProfilePics(true);
      const usersRef = ref(storage, 'users');
      const result = await listAll(usersRef);
      
      const profilePicUrls = [];
      for (const itemRef of result.items) {
        const downloadURL = await getDownloadURL(itemRef);
        profilePicUrls.push({
          id: itemRef.name,
          url: downloadURL,
          name: itemRef.name
        });
      }
      
      setAvailableProfilePics(profilePicUrls);
      setProfilePicsCache(profilePicUrls); // Cache for next time
      setIsCacheLoaded(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to load profile pictures');
    } finally {
      setIsLoadingProfilePics(false);
    }
  };

  // Update user's profile picture
  const updateProfilePicture = async (newProfilePicUrl) => {
    if (!currentUserId) return;
    
    try {
      setIsUpdatingProfilePic(true);
      
      // Update in Firestore
      const userRef = doc(db, 'users', currentUserId);
      await updateDoc(userRef, {
        profileImage: newProfilePicUrl
      });
      
      // Update local state
      setUserData(prevData => ({
        ...prevData,
        profileImage: newProfilePicUrl
      }));
      
      setShowProfilePicModal(false);
      setSelectedProfilePic(null);
      Alert.alert('Success', 'Profile picture updated successfully!');
      
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile picture');
    } finally {
      setIsUpdatingProfilePic(false);
    }
  };

  // Handle profile picture selection (not update yet)
  const handleProfilePicSelect = (profilePic) => {
    setSelectedProfilePic(profilePic);
  };

  // Confirm and update profile picture
  const confirmProfilePicUpdate = () => {
    if (selectedProfilePic) {
      updateProfilePicture(selectedProfilePic.url);
    }
  };

  // Fetch user data from Firestore
  const fetchUserData = async (userId) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserData({
          fullName: data.fullName || 'No Name',
          email: data.email || 'no-email@example.com',
          joinedDate: data.createdAt ? new Date(data.createdAt).getFullYear() : new Date().getFullYear(),
          profileImage: data.profileImage || null
        });
      } else {
        setUserData({
          fullName: 'No Name',
          email: 'no-email@example.com',
          joinedDate: new Date().getFullYear(),
          profileImage: null
        });
      }
    } catch (error) {
    }
  };

  // Fetch user's active bids
  const fetchUserBids = async (userId) => {
    try {
      // Get user's active bids from user collection
      const activeBidsQuery = query(collection(db, `users/${userId}/active`));
      const activeBidsSnapshot = await getDocs(activeBidsQuery);
      
      const bidsData = [];
      
      for (const bidDoc of activeBidsSnapshot.docs) {
        const itemId = bidDoc.id; // Document ID is the item ID
        
        try {
          // Get item details from active listings
          const itemDoc = await getDoc(doc(db, 'listings/listings/active', itemId));
          if (itemDoc.exists()) {
            const itemData = itemDoc.data();
            
            // Get user's bid amount for this item from bidders subcollection
            const bidderDoc = await getDoc(doc(db, `listings/listings/active/${itemId}/bidders`, userId));
            if (bidderDoc.exists()) {
              const bidData = bidderDoc.data();
              
              bidsData.push({
                id: itemId,
                itemName: itemData.itemName,
                description: itemData.description,
                startingBid: itemData.startingBid,
                currentBid: itemData.topBidAmount || itemData.startingBid,
                topBidAmount: itemData.topBidAmount || itemData.startingBid,
                topBidder: itemData.topBidder,
                userBidAmount: bidData.bidAmount,
                bidAt: bidData.bidAt,
                photos: itemData.photos,
                category: itemData.category,
                condition: itemData.condition,
                expiresAt: itemData.expiresAt,
                totalBids: itemData.totalBids || 0,
                isTopBidder: itemData.topBidder === userId,
                status: 'active'
              });
            }
          }
        } catch (error) {
        }
      }
      
      // Sort by bid date (most recent first)
      bidsData.sort((a, b) => new Date(b.bidAt) - new Date(a.bidAt));
      setUserBids(bidsData);
      
    } catch (error) {
    }
  };

  // Fetch user's won items from users/'userId'/past where won: true
  const fetchUserWonItems = async (userId) => {
    try {
      
      // Get user's past bids from users collection
      const pastBidsQuery = query(collection(db, `users/${userId}/past`));
      const pastBidsSnapshot = await getDocs(pastBidsQuery);
      
      const wonItemsData = [];
      
      for (const pastDoc of pastBidsSnapshot.docs) {
        const pastBidData = pastDoc.data();
        const itemId = pastDoc.id; // Document ID is the item ID
        
        // Only process items where won: true
        if (pastBidData.won === true) {
          try {
            // Try to get item details from sold collection first
            let itemDoc = await getDoc(doc(db, 'listings/listings/sold', itemId));
            let itemStatus = 'sold';
            
            // If not in sold, try expired collection
            if (!itemDoc.exists()) {
              itemDoc = await getDoc(doc(db, 'listings/listings/expired', itemId));
              itemStatus = 'expired';
            }
            
            if (itemDoc.exists()) {
              const itemData = itemDoc.data();
              
              // Get user's final bid amount from the item's bidders subcollection
              let userFinalBidAmount = 0;
              try {
                const bidderDoc = await getDoc(doc(db, `listings/listings/${itemStatus}/${itemId}/bidders`, userId));
                if (bidderDoc.exists()) {
                  userFinalBidAmount = bidderDoc.data().bidAmount || 0;
                }
              } catch (bidderError) {
              }
              
              wonItemsData.push({
                id: itemId,
                itemName: itemData.itemName,
                description: itemData.description,
                startingBid: itemData.startingBid,
                finalBidAmount: itemData.finalBidAmount || userFinalBidAmount,
                topBidAmount: itemData.finalBidAmount || userFinalBidAmount,
                topBidder: itemData.buyerId || userId, // For won items, user is the buyer
                userBidAmount: userFinalBidAmount,
                photos: itemData.photos,
                category: itemData.category,
                condition: itemData.condition,
                expiresAt: itemData.expiresAt || itemData.soldAt,
                totalBids: itemData.totalBids || 0,
                soldAt: itemData.soldAt || itemData.updatedAt,
                status: itemStatus
              });
            }
          } catch (error) {
          }
        }
      }
      
      // Sort by sold date (most recent first)
      wonItemsData.sort((a, b) => new Date(b.soldAt) - new Date(a.soldAt));
      setUserWonItems(wonItemsData);
      
    } catch (error) {
    }
  };

  // Fetch user's listed items (for future implementation)
  const fetchUserItems = async (userId) => {
    try {
      // For now, set empty array - can be implemented later when users can list items
      setUserItems([]);
    } catch (error) {
    }
  };

  // Main function to fetch all user data
  const fetchAllUserData = async (userId, showLoading = true) => {
    if (showLoading) {
      setIsLoading(true);
    }
    try {
      await Promise.all([
        fetchUserData(userId),
        fetchUserBids(userId),
        fetchUserItems(userId),
        fetchUserWonItems(userId)
      ]);
    } catch (error) {
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && !isLoggingOut) {
        setCurrentUserId(user.uid);
        
        // Set basic user info immediately to avoid loading screen
        setUserData({
          fullName: user.displayName || 'User',
          email: user.email || 'no-email@example.com',
          joinedDate: new Date().getFullYear(),
          profileImage: user.photoURL || null
        });
        
        // Then fetch full data in background
        fetchAllUserData(user.uid, false);
        
        // Pre-load profile pictures for instant access
        preLoadProfilePics();
      } else if (!user && !isLoggingOut) {
        // Only clear state if we're not in the middle of a logout process
        setCurrentUserId(null);
        setUserData(null);
        setUserBids([]);
        setUserItems([]);
        setUserWonItems([]);
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [isLoggingOut]);

  // Refresh data when screen comes into focus (without loading screen)
  useFocusEffect(
    React.useCallback(() => {
      // Only refresh if we have a user ID but limit frequency
      if (currentUserId) {
        fetchAllUserData(currentUserId, false); // Don't show loading on focus
      }
    }, [currentUserId]) // Remove userData dependency to prevent constant re-fetching
  );

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      
      // Clear local state first to prevent any re-renders during logout
      setUserData(null);
      setUserBids([]);
      setUserItems([]);
      setUserWonItems([]);
      setCurrentUserId(null);
      
      // Sign out from Firebase
      await signOut(auth);
      
      // Navigate to login screen
      navigation.reset({
        index: 0,
        routes: [{ name: 'LoginScreen' }],
      });
      
    } catch (error) {
      Alert.alert('Error', 'Failed to logout. Please try again.');
      setIsLoggingOut(false);
    }
  };

  const handleTabPress = (tab) => {
    setActiveTab(tab);
  };

  const handleItemPress = (item) => {
    // Navigate to item details
    navigation.navigate('UserItemScreen', { item });
  };

  const handleProfilePicPress = () => {
    setShowProfilePicModal(true);
    setSelectedProfilePic(null); // Reset selection
    fetchAvailableProfilePics();
  };

  const formatCurrency = (amount) => {
    return `$${parseFloat(amount).toFixed(2)}`;
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
        <Image 
          source={item.photos && item.photos.length > 0 
            ? { uri: item.photos[0] } 
            : require('../../assets/icon.png')
          } 
          style={styles.itemImage} 
        />
      </View>
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle}>{item.itemName}</Text>
        <Text style={styles.itemBid}>Current Bid: {formatCurrency(item.currentBid)}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderBidItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.itemCard}
      onPress={() => handleItemPress(item)}
    >
      <View style={styles.itemImageContainer}>
        <Image 
          source={item.photos && item.photos.length > 0 
            ? { uri: item.photos[0] } 
            : require('../../assets/icon.png')
          } 
          style={styles.itemImage} 
        />
        {item.isTopBidder && (
          <View style={styles.topBidderBadge}>
            <Text style={styles.topBidderText}>TOP</Text>
          </View>
        )}
      </View>
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle}>{item.itemName}</Text>
        <Text style={styles.itemBid}>Your Bid: {formatCurrency(item.userBidAmount)}</Text>
        <Text style={styles.currentBidText}>Current: {formatCurrency(item.currentBid)}</Text>
        {item.isTopBidder && (
          <Text style={styles.topBidderStatus}>🏆 You're winning!</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderWonItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.itemCard}
      onPress={() => handleItemPress(item)}
    >
      <View style={styles.itemImageContainer}>
        <Image 
          source={item.photos && item.photos.length > 0 
            ? { uri: item.photos[0] } 
            : require('../../assets/icon.png')
          } 
          style={styles.itemImage} 
        />
        <View style={styles.wonBadge}>
          <Text style={styles.wonText}>WON</Text>
        </View>
      </View>
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle}>{item.itemName}</Text>
        <Text style={styles.itemBid}>Won at: {formatCurrency(item.finalBidAmount)}</Text>
        <Text style={styles.currentBidText}>Category: {item.category}</Text>
        <Text style={styles.wonStatus}>🎉 Congratulations!</Text>
      </View>
    </TouchableOpacity>
  );

  const renderProfilePicOption = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.profilePicOption,
        selectedProfilePic?.id === item.id && styles.selectedProfilePicOption
      ]}
      onPress={() => handleProfilePicSelect(item)}
      disabled={isUpdatingProfilePic}
    >
      <Image source={{ uri: item.url }} style={styles.profilePicOptionImage} />
      {selectedProfilePic?.id === item.id && (
        <View style={styles.selectedOverlay}>
          <Ionicons name="checkmark-circle" size={24} color={Colors.PRIMARY_GREEN} />
        </View>
      )}
      {isUpdatingProfilePic && selectedProfilePic?.id === item.id && (
        <View style={styles.profilePicLoading}>
          <ActivityIndicator size="small" color={Colors.PRIMARY_GREEN} />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        

        {/* Profile Info */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Image 
              source={userData?.profileImage 
                ? { uri: userData.profileImage }
                : require('../../assets/icon.png')
              } 
              style={styles.avatar}
            />
            <TouchableOpacity 
              style={styles.cameraButton}
              onPress={handleProfilePicPress}
            >
              <Ionicons name="camera" size={16} color={Colors.WHITE} />
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>{userData?.fullName || 'User'}</Text>
          <Text style={styles.userHandle}>{userData?.email || ''}</Text>
          <Text style={styles.joinedDate}>Joined {userData?.joinedDate || 'Unknown'}</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          {renderStatCard(userBids.length, 'Bids')}
          {renderStatCard(userWonItems.length, 'Won')}
          {renderStatCard(userBids.filter(bid => bid.isTopBidder).length, 'Winning')}
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'bids' && styles.activeTab]}
            onPress={() => handleTabPress('bids')}
          >
            <Text style={[styles.tabText, activeTab === 'bids' && styles.activeTabText]}>
              Bids ({userBids.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'won' && styles.activeTab]}
            onPress={() => handleTabPress('won')}
          >
            <Text style={[styles.tabText, activeTab === 'won' && styles.activeTabText]}>
              Won ({userWonItems.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.contentContainer}>
          {activeTab === 'won' && (
            userWonItems.length > 0 ? (
              <FlatList
                data={userWonItems}
                renderItem={renderWonItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No items won yet</Text>
              </View>
            )
          )}
          {activeTab === 'bids' && (
            userBids.length > 0 ? (
              <FlatList
                data={userBids}
                renderItem={renderBidItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No bids placed yet</Text>
              </View>
            )
          )}
        </View>
      </ScrollView>

      {/* Sign Out Button */}
      <View style={styles.signOutContainer}>
        <TouchableOpacity style={styles.signOutButton} onPress={handleLogout}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Profile Picture Selection Modal */}
      <Modal
        visible={showProfilePicModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowProfilePicModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.profilePicModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Profile Picture</Text>
              <TouchableOpacity onPress={() => setShowProfilePicModal(false)}>
                <Ionicons name="close" size={24} color={Colors.TEXT_BLACK} />
              </TouchableOpacity>
            </View>
            
            {isLoadingProfilePics ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.PRIMARY_GREEN} />
                <Text style={styles.loadingText}>Loading pictures...</Text>
              </View>
            ) : (
              <>
                <FlatList
                  data={availableProfilePics}
                  renderItem={renderProfilePicOption}
                  keyExtractor={(item) => item.id}
                  numColumns={3}
                  contentContainerStyle={styles.profilePicGrid}
                  showsVerticalScrollIndicator={false}
                />
                
                {/* Confirmation Buttons */}
                <View style={styles.modalButtons}>
                  <TouchableOpacity 
                    style={styles.cancelButton}
                    onPress={() => {
                      setShowProfilePicModal(false);
                      setSelectedProfilePic(null);
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[
                      styles.confirmButton,
                      (!selectedProfilePic || isUpdatingProfilePic) && styles.confirmButtonDisabled
                    ]}
                    onPress={confirmProfilePicUpdate}
                    disabled={!selectedProfilePic || isUpdatingProfilePic}
                  >
                    {isUpdatingProfilePic ? (
                      <ActivityIndicator size="small" color={Colors.WHITE} />
                    ) : (
                      <Text style={styles.confirmButtonText}>
                        {selectedProfilePic ? 'Set as Profile Picture' : 'Select a Picture'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.TEXT_GRAY,
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
    position: 'relative',
  },
  avatar: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: Colors.PRIMARY_GREEN,
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.WHITE,
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
  currentBidText: {
    fontSize: 12,
    color: Colors.TEXT_GRAY,
    marginTop: 2,
  },
  topBidderBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: Colors.PRIMARY_GREEN,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  topBidderText: {
    color: Colors.WHITE,
    fontSize: 8,
    fontWeight: 'bold',
  },
  topBidderStatus: {
    fontSize: 12,
    color: Colors.PRIMARY_GREEN,
    fontWeight: '600',
    marginTop: 2,
  },
  wonBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#FFD700', // Gold color for won items
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  wonText: {
    color: Colors.WHITE,
    fontSize: 8,
    fontWeight: 'bold',
  },
  wonStatus: {
    fontSize: 12,
    color: '#FFD700', // Gold color for won status
    fontWeight: '600',
    marginTop: 2,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePicModalContent: {
    backgroundColor: Colors.WHITE,
    width: '90%',
    maxHeight: '80%',
    borderRadius: 15,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.TEXT_BLACK,
  },
  profilePicGrid: {
    paddingVertical: 10,
  },
  profilePicOption: {
    flex: 1,
    aspectRatio: 1,
    margin: 5,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedProfilePicOption: {
    borderColor: Colors.PRIMARY_GREEN,
    borderWidth: 3,
  },
  profilePicOptionImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  selectedOverlay: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    padding: 2,
  },
  profilePicLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    gap: 15,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: Colors.LIGHT_GRAY,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: Colors.TEXT_BLACK,
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 2,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: Colors.PRIMARY_GREEN,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  confirmButtonDisabled: {
    backgroundColor: Colors.LIGHT_GRAY,
    opacity: 0.6,
  },
  confirmButtonText: {
    color: Colors.WHITE,
    fontSize: 16,
    fontWeight: '600',
  },
});
