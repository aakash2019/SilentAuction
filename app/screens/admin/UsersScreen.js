// screens/admin/UsersScreen.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../constants/Colors';
import { db } from '../../firebase';
import { User } from '../../models/User';

export default function UsersScreen() {
  const [searchText, setSearchText] = useState('');
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch users from Firestore
  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      console.log('Fetching users from Firestore...');
      
      const usersQuery = query(
        collection(db, 'users'),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(usersQuery);
      const usersData = [];
      
      querySnapshot.forEach((doc) => {
        try {
          const user = User.fromFirestore(doc);
          usersData.push(user);
        } catch (error) {
          console.error('Error parsing user document:', doc.id, error);
        }
      });
      
      console.log(`Fetched ${usersData.length} users from Firestore`);
      setUsers(usersData);
      setFilteredUsers(usersData);
      
    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert('Error', 'Failed to load users. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchUsers();
  }, []);

  // Refresh when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchUsers();
    }, [])
  );

  // Filter users based on search text
  useEffect(() => {
    if (!searchText.trim()) {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user => {
        const searchLower = searchText.toLowerCase();
        const nameMatch = user.getDisplayName().toLowerCase().includes(searchLower);
        const emailMatch = user.email.toLowerCase().includes(searchLower);
        return nameMatch || emailMatch;
      });
      setFilteredUsers(filtered);
    }
  }, [searchText, users]);

  // Helper function to format date for display
  const formatJoinDate = (dateString) => {
    if (!dateString) return 'Unknown';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Unknown';
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Unknown';
    }
  };

  const handleUserPress = (user) => {
    // Navigate to user details
    console.log('User pressed:', user.getDisplayName());
    console.log('User details:', {
      uid: user.uid,
      email: user.email,
      isAdmin: user.hasAdminPrivileges(),
      isActive: user.isAccountActive(),
      joinedDate: formatJoinDate(user.createdAt)
    });
  };

  const renderUserItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.userItem}
      onPress={() => handleUserPress(item)}
    >
      <View style={styles.avatarContainer}>
        {item.profileImageUrl ? (
          <Image source={{ uri: item.profileImageUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {item.getDisplayName().charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.userInfo}>
        <View style={styles.userNameRow}>
          <Text style={styles.userName}>{item.getDisplayName()}</Text>
          {item.hasAdminPrivileges() && (
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>Admin</Text>
            </View>
          )}
          {!item.isAccountActive() && (
            <View style={styles.inactiveBadge}>
              <Text style={styles.inactiveBadgeText}>Inactive</Text>
            </View>
          )}
        </View>
        <Text style={styles.userEmail}>{item.email}</Text>
        <Text style={styles.userJoinDate}>
          Joined: {formatJoinDate(item.createdAt)}
        </Text>
      </View>
      <Ionicons 
        name="chevron-forward" 
        size={20} 
        color={Colors.TEXT_GRAY} 
      />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
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
            placeholder="Search users"
            placeholderTextColor={Colors.TEXT_GRAY}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
      </View>

      {/* Users List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.PRIMARY_GREEN} />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      ) : filteredUsers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={60} color={Colors.TEXT_GRAY} />
          <Text style={styles.emptyTitle}>
            {searchText ? 'No users found' : 'No users yet'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {searchText 
              ? 'Try adjusting your search criteria' 
              : 'Users will appear here when they sign up'
            }
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.uid}
          style={styles.listContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshing={isLoading}
          onRefresh={fetchUsers}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.BACKGROUND_WHITE,
  },
  header: {
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
    textAlign: 'center',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 15,
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
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.BACKGROUND_WHITE,
    paddingVertical: 15,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BACKGROUND_LIGHT_GRAY,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.BACKGROUND_LIGHT_GRAY,
    marginRight: 15,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.PRIMARY_GREEN,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.WHITE,
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.TEXT_BLACK,
    marginRight: 8,
  },
  adminBadge: {
    backgroundColor: Colors.PRIMARY_GREEN,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 4,
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.WHITE,
  },
  inactiveBadge: {
    backgroundColor: Colors.TEXT_GRAY,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  inactiveBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.WHITE,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.TEXT_GRAY,
    fontWeight: '400',
    marginBottom: 2,
  },
  userJoinDate: {
    fontSize: 12,
    color: Colors.TEXT_GRAY,
    fontWeight: '300',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.TEXT_GRAY,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.TEXT_BLACK,
    marginTop: 15,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.TEXT_GRAY,
    marginTop: 5,
    textAlign: 'center',
    lineHeight: 20,
  },
});
