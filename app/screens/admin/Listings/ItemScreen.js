// screens/admin/Listings/ItemScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Modal,
  FlatList,
  Alert,
  ActivityIndicator
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../../constants/Colors';
import { useNavigation, useRoute } from '@react-navigation/native';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../../firebase';

const { width } = Dimensions.get('window');

export default function ItemScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { item } = route.params;

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showBiddersModal, setShowBiddersModal] = useState(false);
  const [bidders, setBidders] = useState([]);
  const [isLoadingBidders, setIsLoadingBidders] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('');

  // Fetch bidders from Firestore
  const fetchBidders = async () => {
    if (!item?.id) return;
    
    setIsLoadingBidders(true);
    try {
      console.log('Fetching bidders for item:', item.id);
      
      // Get the collection path based on item status
      let collectionPath;
      if (item.status === 'active') {
        collectionPath = `listings/listings/active/${item.id}/bidders`;
      } else if (item.status === 'sold') {
        collectionPath = `listings/listings/sold/${item.id}/bidders`;
      } else {
        collectionPath = `listings/listings/expired/${item.id}/bidders`;
      }

      const biddersQuery = query(
        collection(db, collectionPath),
        orderBy('bidAmount', 'desc')
      );

      const querySnapshot = await getDocs(biddersQuery);
      const biddersData = [];

      querySnapshot.forEach((doc) => {
        biddersData.push({
          id: doc.id,
          ...doc.data()
        });
      });

      console.log(`Found ${biddersData.length} bidders`);
      setBidders(biddersData);
    } catch (error) {
      console.error('Error fetching bidders:', error);
      Alert.alert('Error', 'Failed to load bidders information.');
    } finally {
      setIsLoadingBidders(false);
    }
  };

  // Calculate time remaining with seconds
  const calculateTimeRemaining = () => {
    if (!item?.expiresAt) return { text: 'No expiry date', expired: true };

    try {
      const expiryDate = new Date(item.expiresAt);
      const now = new Date();
      const timeDiff = expiryDate.getTime() - now.getTime();

      if (timeDiff <= 0) {
        return { text: 'Expired', expired: true };
      }

      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

      return {
        text: `${days}d ${hours}h ${minutes}m ${seconds}s`,
        days,
        hours,
        minutes,
        seconds,
        expired: false
      };
    } catch (error) {
      console.error('Error calculating time remaining:', error);
      return { text: 'Unknown', expired: true };
    }
  };

  // Update timer every second for live countdown
  useEffect(() => {
    const updateTimer = () => {
      setTimeRemaining(calculateTimeRemaining());
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000); // Update every second

    return () => clearInterval(interval);
  }, [item?.expiresAt]);

  // Fetch bidders when component mounts
  useEffect(() => {
    fetchBidders();
  }, [item?.id]);

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleImageScroll = (event) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = Math.floor(event.nativeEvent.contentOffset.x / slideSize);
    setCurrentImageIndex(index);
  };

  const getTopBidder = () => {
    if (bidders.length === 0) return null;
    return bidders[0]; // Already sorted by highest bid
  };

  const formatCurrency = (amount) => {
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const renderBidderItem = ({ item: bidder }) => (
    <View style={styles.bidderItem}>
      <View style={styles.bidderAvatar}>
        <Text style={styles.bidderAvatarText}>
          {bidder.displayName?.charAt(0)?.toUpperCase() || 'U'}
        </Text>
      </View>
      <View style={styles.bidderInfo}>
        <Text style={styles.bidderName}>{bidder.displayName || 'Unknown User'}</Text>
        <Text style={styles.bidderEmail}>{bidder.email || 'No email'}</Text>
        <Text style={styles.bidTime}>
          {formatDate(bidder.bidAt)}
        </Text>
      </View>
      <View style={styles.bidAmountContainer}>
        <Text style={styles.bidAmount}>{formatCurrency(bidder.bidAmount)}</Text>
      </View>
    </View>
  );

  const renderBiddersModal = () => (
    <Modal
      visible={showBiddersModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowBiddersModal(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>All Bidders</Text>
          <TouchableOpacity
            onPress={() => setShowBiddersModal(false)}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={24} color={Colors.TEXT_BLACK} />
          </TouchableOpacity>
        </View>

        {isLoadingBidders ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.PRIMARY_GREEN} />
            <Text style={styles.loadingText}>Loading bidders...</Text>
          </View>
        ) : bidders.length === 0 ? (
          <View style={styles.emptyBidders}>
            <Ionicons name="people-outline" size={64} color={Colors.TEXT_GRAY} />
            <Text style={styles.emptyBiddersTitle}>No Bidders Yet</Text>
            <Text style={styles.emptyBiddersSubtitle}>
              Bidders will appear here when they place bids
            </Text>
          </View>
        ) : (
          <FlatList
            data={bidders}
            renderItem={renderBidderItem}
            keyExtractor={(item) => item.id}
            style={styles.biddersList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.biddersListContent}
          />
        )}
      </SafeAreaView>
    </Modal>
  );

  const photos = item?.photos && item.photos.length > 0 ? item.photos : [null];
  const topBidder = getTopBidder();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.TEXT_BLACK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Item Details</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Image Slider */}
        <View style={styles.imageSliderContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleImageScroll}
            scrollEventThrottle={16}
          >
            {photos.map((photo, index) => (
              <View key={index} style={styles.imageSlide}>
                <Image
                  source={
                    photo 
                      ? { uri: photo }
                      : require('../../../assets/icon.png')
                  }
                  style={styles.itemImage}
                  resizeMode="cover"
                />
              </View>
            ))}
          </ScrollView>

          {/* Image Indicators */}
          {photos.length > 1 && (
            <View style={styles.imageIndicators}>
              {photos.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.indicator,
                    index === currentImageIndex && styles.activeIndicator
                  ]}
                />
              ))}
            </View>
          )}
        </View>

        {/* Item Information */}
        <View style={styles.itemInfoContainer}>
          {/* Title and Category */}
          <View style={styles.titleSection}>
            <Text style={styles.itemTitle}>{item?.itemName || 'Untitled Item'}</Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{item?.category || 'Uncategorized'}</Text>
            </View>
          </View>

          {/* Compact Info Grid */}
          <View style={styles.infoGrid}>
            {/* Starting Bid */}
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Starting Bid</Text>
              <Text style={styles.startingBidText}>
                {formatCurrency(item?.startingBid || 0)}
              </Text>
            </View>

            {/* Condition */}
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Condition</Text>
              <Text style={styles.conditionText}>{item?.condition || 'Not specified'}</Text>
            </View>
          </View>

          {/* Live Countdown Timer */}
          <View style={styles.timerCard}>
            <Text style={styles.timerCardLabel}>Time Remaining</Text>
            {timeRemaining?.expired ? (
              <View style={styles.expiredContainer}>
                <Ionicons name="time-outline" size={24} color="#FF6B6B" />
                <Text style={styles.expiredText}>Auction Expired</Text>
              </View>
            ) : (
              <View style={styles.countdownContainer}>
                <View style={styles.timeBlock}>
                  <Text style={styles.timeNumber}>{timeRemaining?.days || 0}</Text>
                  <Text style={styles.timeLabel}>Days</Text>
                </View>
                <Text style={styles.timeSeparator}>:</Text>
                <View style={styles.timeBlock}>
                  <Text style={styles.timeNumber}>{timeRemaining?.hours || 0}</Text>
                  <Text style={styles.timeLabel}>Hours</Text>
                </View>
                <Text style={styles.timeSeparator}>:</Text>
                <View style={styles.timeBlock}>
                  <Text style={styles.timeNumber}>{timeRemaining?.minutes || 0}</Text>
                  <Text style={styles.timeLabel}>Mins</Text>
                </View>
                <Text style={styles.timeSeparator}>:</Text>
                <View style={styles.timeBlock}>
                  <Text style={styles.timeNumber}>{timeRemaining?.seconds || 0}</Text>
                  <Text style={styles.timeLabel}>Secs</Text>
                </View>
              </View>
            )}
            <Text style={styles.expiryText}>
              Expires: {formatDate(item?.expiresAt)}
            </Text>
          </View>

          {/* Bidders Section */}
          <TouchableOpacity 
            style={styles.biddersCard}
            onPress={() => setShowBiddersModal(true)}
          >
            <View style={styles.biddersHeader}>
              <Text style={styles.biddersTitle}>
                Bidders {bidders.length === 0 ? '(No Bids Yet)' : `(${bidders.length} bid${bidders.length !== 1 ? 's' : ''})`}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={Colors.TEXT_GRAY} />
            </View>
            
            {topBidder ? (
              <View style={styles.topBidderInfo}>
                <View style={styles.topBidderAvatar}>
                  <Text style={styles.topBidderAvatarText}>
                    {topBidder.displayName?.charAt(0)?.toUpperCase() || 'U'}
                  </Text>
                </View>
                <View style={styles.topBidderDetails}>
                  <Text style={styles.topBidderName}>
                    {topBidder.displayName || 'Unknown User'}
                  </Text>
                  <Text style={styles.topBidderLabel}>Highest Bidder</Text>
                </View>
                <Text style={styles.topBidderAmount}>
                  {formatCurrency(topBidder.bidAmount)}
                </Text>
              </View>
            ) : (
              <View style={styles.noBidsContainer}>
                <Ionicons name="gavel-outline" size={40} color={Colors.TEXT_GRAY} />
                <Text style={styles.noBidsText}>No bids placed yet</Text>
                <Text style={styles.noBidsSubtext}>Be the first to place a bid!</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Description */}
          <View style={styles.descriptionCard}>
            <Text style={styles.descriptionLabel}>Description</Text>
            <Text style={styles.descriptionText}>
              {item?.description || 'No description provided.'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bidders Modal */}
      {renderBiddersModal()}
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
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BACKGROUND_LIGHT_GRAY,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.TEXT_BLACK,
    textAlign: 'center',
  },
  headerRight: {
    width: 34,
  },
  scrollContainer: {
    flex: 1,
  },
  imageSliderContainer: {
    height: 300,
    backgroundColor: Colors.BACKGROUND_LIGHT_GRAY,
  },
  imageSlide: {
    width: width,
    height: 300,
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  imageIndicators: {
    position: 'absolute',
    bottom: 15,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  activeIndicator: {
    backgroundColor: Colors.WHITE,
  },
  itemInfoContainer: {
    padding: 20,
  },
  titleSection: {
    marginBottom: 20,
  },
  itemTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.TEXT_BLACK,
    marginBottom: 8,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.PRIMARY_GREEN,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.WHITE,
    textTransform: 'capitalize',
  },
  // Compact Info Grid
  infoGrid: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 15,
  },
  infoCard: {
    flex: 1,
    backgroundColor: Colors.BACKGROUND_LIGHT_GRAY,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.TEXT_GRAY,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  startingBidText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.PRIMARY_GREEN,
  },
  conditionText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.TEXT_BLACK,
    textTransform: 'capitalize',
  },
  // Timer Card
  timerCard: {
    backgroundColor: '#F8F9FA',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.PRIMARY_GREEN,
  },
  timerCardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.TEXT_GRAY,
    textAlign: 'center',
    marginBottom: 15,
    textTransform: 'uppercase',
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  timeBlock: {
    alignItems: 'center',
    minWidth: 50,
  },
  timeNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.PRIMARY_GREEN,
  },
  timeLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.TEXT_GRAY,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  timeSeparator: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.PRIMARY_GREEN,
    marginHorizontal: 5,
  },
  expiredContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  expiredText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF6B6B',
    marginLeft: 8,
  },
  expiryText: {
    fontSize: 12,
    color: Colors.TEXT_GRAY,
    textAlign: 'center',
  },
  // Bidders Card
  biddersCard: {
    backgroundColor: Colors.BACKGROUND_WHITE,
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    shadowColor: Colors.TEXT_BLACK,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.BACKGROUND_LIGHT_GRAY,
  },
  biddersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  biddersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.TEXT_BLACK,
  },
  topBidderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topBidderAvatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: Colors.PRIMARY_GREEN,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  topBidderAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.WHITE,
  },
  topBidderDetails: {
    flex: 1,
  },
  topBidderName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.TEXT_BLACK,
  },
  topBidderLabel: {
    fontSize: 12,
    color: Colors.TEXT_GRAY,
  },
  topBidderAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.PRIMARY_GREEN,
  },
  noBidsContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noBidsText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.TEXT_GRAY,
    marginTop: 10,
  },
  noBidsSubtext: {
    fontSize: 14,
    color: Colors.TEXT_GRAY,
    marginTop: 4,
  },
  // Description Card
  descriptionCard: {
    backgroundColor: Colors.BACKGROUND_LIGHT_GRAY,
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.TEXT_GRAY,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  descriptionText: {
    fontSize: 16,
    color: Colors.TEXT_BLACK,
    lineHeight: 24,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.BACKGROUND_WHITE,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BACKGROUND_LIGHT_GRAY,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.TEXT_BLACK,
  },
  closeButton: {
    padding: 5,
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
  emptyBidders: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyBiddersTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.TEXT_BLACK,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyBiddersSubtitle: {
    fontSize: 14,
    color: Colors.TEXT_GRAY,
    textAlign: 'center',
    lineHeight: 20,
  },
  biddersList: {
    flex: 1,
  },
  biddersListContent: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  bidderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BACKGROUND_LIGHT_GRAY,
  },
  bidderAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.PRIMARY_GREEN,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  bidderAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.WHITE,
  },
  bidderInfo: {
    flex: 1,
  },
  bidderName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.TEXT_BLACK,
    marginBottom: 2,
  },
  bidderEmail: {
    fontSize: 14,
    color: Colors.TEXT_GRAY,
    marginBottom: 2,
  },
  bidTime: {
    fontSize: 12,
    color: Colors.TEXT_GRAY,
  },
  bidAmountContainer: {
    alignItems: 'flex-end',
  },
  bidAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.PRIMARY_GREEN,
  },
});
