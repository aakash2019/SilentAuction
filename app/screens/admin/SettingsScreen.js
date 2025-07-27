import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import React, { useEffect, useState } from 'react';
import { auth } from '../../firebase';
import { signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../constants/Colors';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function SettingsScreen({}) {
  const [userName, setUserName] = useState('');
  const db = getFirestore();

  const navigation = useNavigation();
  

  useEffect(() => {
    const fetchUserName = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, 'admins', user.uid));
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
        routes: [{ name: 'LoginScreen', params: { defaultTab: 'Admin' } }],
      });
    } catch (error) {
      alert('Logout failed!');
    }
  };

  const handleSettingPress = (settingId) => {
    switch(settingId) {
      case 'account-details':
        
        break;
      case 'change-password':
        
        break;
      case 'app-settings':
        
        break;
      case 'help-support':
        
        break;
      case 'manage-listings':
        
        break;
      case 'manage-users':
        
        break;
      default:
        break;
    }
  };

  const renderSettingItem = (icon, title, subtitle, settingId) => (
    <TouchableOpacity 
      key={settingId}
      style={styles.settingItem}
      onPress={() => handleSettingPress(settingId)}
    >
      <View style={styles.settingIcon}>
        <Ionicons name={icon} size={24} color={Colors.TEXT_BLACK} />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingSubtitle}>{subtitle}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderSection = (title, items) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map(item => renderSettingItem(item.icon, item.title, item.subtitle, item.id))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Account Section */}
        {renderSection('Account', [
          {
            icon: 'person-outline',
            title: 'Account Details',
            subtitle: 'Manage your account details',
            id: 'account-details'
          },
          {
            icon: 'lock-closed-outline',
            title: 'Change Password',
            subtitle: 'Change your password',
            id: 'change-password'
          }
        ])}

        {/* App Settings Section */}
        {renderSection('App Settings', [
          {
            icon: 'settings-outline',
            title: 'App Settings',
            subtitle: 'Configure app settings',
            id: 'app-settings'
          }
        ])}

        {/* Help & Support Section */}
        {renderSection('Help & Support', [
          {
            icon: 'help-circle-outline',
            title: 'Help & Support',
            subtitle: 'Access help and support',
            id: 'help-support'
          }
        ])}

        {/* Quick Actions Section */}
        {renderSection('Quick Actions', [
          {
            icon: 'list-outline',
            title: 'Manage Listings',
            subtitle: 'Manage listings',
            id: 'manage-listings'
          },
          {
            icon: 'people-outline',
            title: 'Manage Users',
            subtitle: 'Manage users',
            id: 'manage-users'
          }
        ])}

        {/* Logout Button */}
        <View style={styles.logoutContainer}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
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
  scrollView: {
    flex: 1,
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
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.BACKGROUND_WHITE,
    paddingVertical: 15,
    paddingHorizontal: 5,
    marginBottom: 5,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.BACKGROUND_LIGHT_GRAY,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.TEXT_BLACK,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: Colors.TEXT_GRAY,
    fontWeight: '400',
  },
  logoutContainer: {
    marginTop: 30,
    marginBottom: 40,
    marginHorizontal: 20,
  },
  logoutButton: {
    backgroundColor: Colors.PRIMARY_GREEN,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonText: {
    color: Colors.BLACK,
    fontSize: 16,
    fontWeight: '600',
  },
});
