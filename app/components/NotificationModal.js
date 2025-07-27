// components/NotificationModal.js
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  Alert
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors } from '../constants/Colors';
import NotificationService from '../services/NotificationService';

const NotificationModal = ({ visible, onClose, userId, onNotificationPress }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('new'); // 'new' or 'old'

  useEffect(() => {
    if (visible && userId) {
      fetchNotifications();
    }
  }, [visible, userId]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const userNotifications = await NotificationService.getUserNotifications(userId);
      setNotifications(userNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      Alert.alert('Error', 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationPress = async (notification) => {
    try {
      // Mark as read if unread
      if (!notification.isRead) {
        await NotificationService.markAsRead(notification.id);
        // Update local state
        setNotifications(prev => 
          prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
        );
      }
      
      // Navigate to item if callback provided
      if (onNotificationPress && notification.itemId) {
        onNotificationPress(notification);
      }
    } catch (error) {
      console.error('Error handling notification press:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await NotificationService.markAllAsRead(userId);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
      Alert.alert('Error', 'Failed to mark notifications as read');
    }
  };

  const getFilteredNotifications = () => {
    if (activeTab === 'new') {
      return notifications.filter(n => !n.isRead);
    } else {
      return notifications.filter(n => n.isRead);
    }
  };

  const renderNotification = ({ item }) => {
    const timeAgo = NotificationService.formatNotificationTime(item.createdAt);
    const icon = NotificationService.getNotificationIcon(item.type);
    const color = NotificationService.getNotificationColor(item.priority);

    return (
      <TouchableOpacity 
        style={[
          styles.notificationItem,
          !item.isRead && styles.unreadNotification
        ]}
        onPress={() => handleNotificationPress(item)}
      >
        <View style={styles.notificationContent}>
          <View style={[styles.iconContainer, { backgroundColor: color }]}>
            <Ionicons name={icon} size={20} color={Colors.BACKGROUND_WHITE} />
          </View>
          
          <View style={styles.textContainer}>
            <Text style={[
              styles.notificationTitle,
              !item.isRead && styles.unreadText
            ]}>
              {item.title}
            </Text>
            <Text style={styles.notificationMessage} numberOfLines={2}>
              {item.message}
            </Text>
            <Text style={styles.notificationTime}>
              {timeAgo}
            </Text>
          </View>
          
          {!item.isRead && <View style={styles.unreadDot} />}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons 
        name={activeTab === 'new' ? 'notifications-outline' : 'checkmark-circle-outline'} 
        size={64} 
        color={Colors.TEXT_LIGHT_GRAY} 
      />
      <Text style={styles.emptyTitle}>
        {activeTab === 'new' ? 'No New Notifications' : 'No Read Notifications'}
      </Text>
      <Text style={styles.emptyMessage}>
        {activeTab === 'new' 
          ? 'You\'re all caught up! New notifications will appear here.'
          : 'Notifications you\'ve read will appear here.'
        }
      </Text>
    </View>
  );

  const filteredNotifications = getFilteredNotifications();
  const newCount = notifications.filter(n => !n.isRead).length;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Colors.TEXT_BLACK} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          {newCount > 0 && (
            <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.markAllButton}>
              <Text style={styles.markAllText}>Mark All Read</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'new' && styles.activeTab]}
            onPress={() => setActiveTab('new')}
          >
            <Text style={[styles.tabText, activeTab === 'new' && styles.activeTabText]}>
              New {newCount > 0 && `(${newCount})`}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'old' && styles.activeTab]}
            onPress={() => setActiveTab('old')}
          >
            <Text style={[styles.tabText, activeTab === 'old' && styles.activeTabText]}>
              Read
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.PRIMARY_GREEN} />
              <Text style={styles.loadingText}>Loading notifications...</Text>
            </View>
          ) : filteredNotifications.length === 0 ? (
            renderEmptyState()
          ) : (
            <FlatList
              data={filteredNotifications}
              renderItem={renderNotification}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContainer}
            />
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

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
    borderBottomWidth: 1,
    borderBottomColor: Colors.BACKGROUND_LIGHT_GRAY,
  },
  closeButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.TEXT_BLACK,
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: Colors.PRIMARY_GREEN,
  },
  markAllText: {
    fontSize: 12,
    color: Colors.BACKGROUND_WHITE,
    fontWeight: '500',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.BACKGROUND_LIGHT_GRAY,
    margin: 20,
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: Colors.BACKGROUND_WHITE,
    shadowColor: Colors.TEXT_BLACK,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 14,
    color: Colors.TEXT_GRAY,
    fontWeight: '500',
  },
  activeTabText: {
    color: Colors.TEXT_BLACK,
    fontWeight: '600',
  },
  content: {
    flex: 1,
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
  listContainer: {
    padding: 20,
  },
  notificationItem: {
    backgroundColor: Colors.BACKGROUND_WHITE,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: Colors.TEXT_BLACK,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  unreadNotification: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.PRIMARY_GREEN,
  },
  notificationContent: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.TEXT_BLACK,
    marginBottom: 4,
  },
  unreadText: {
    fontWeight: '600',
  },
  notificationMessage: {
    fontSize: 14,
    color: Colors.TEXT_GRAY,
    lineHeight: 20,
    marginBottom: 6,
  },
  notificationTime: {
    fontSize: 12,
    color: Colors.TEXT_LIGHT_GRAY,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.PRIMARY_GREEN,
    marginLeft: 8,
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.TEXT_BLACK,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: Colors.TEXT_GRAY,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default NotificationModal;
