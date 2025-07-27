import React, {useState} from 'react';
import { useNavigation } from '@react-navigation/native';
import {  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  StatusBar,
  StyleSheet,
  Alert,
  ActivityIndicator
} from 'react-native';

import { auth, db } from '../../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, updateDoc, getFirestore } from 'firebase/firestore';
import { Colors } from '../../constants/Colors';
import User from '../../models/User';

export default function LoginScreen({ route }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(route?.params?.defaultTab || 'Bidder'); // 'Bidder' or 'Admin'

  const navigation = useNavigation();

  const handleLogin = async () => {
    let errors = [];

    if (!email.trim()) {
      errors.push('Email is required');
    }
    if (!password.trim()) {
      errors.push('Password is required');
    }

    if (errors.length > 0) {
      Alert.alert('Error', errors.join('\n'));
      return;
    }

    setIsLoading(true);

    try {
      // Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const firebaseUser = userCredential.user;

      if (activeTab === 'Bidder') {
        // Bidder login logic - check users collection
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        
        if (userDoc.exists()) {
          // Create User model instance
          const user = User.fromFirestore(userDoc);
          const userData = userDoc.data();
          
          // Check if account is active
          if (!user.isAccountActive()) {
            Alert.alert('Account Disabled', 'Your account has been disabled. Please contact support.');
            await auth.signOut();
            setIsLoading(false);
            return;
          }

          // Check if this is actually an admin user trying to login as bidder
          if (userData.isAdmin === true) {
            Alert.alert(
              'Admin Account Detected', 
              'This is an admin account. Please use the Admin tab to access admin features.',
              [{ text: 'OK' }]
            );
            await auth.signOut();
            setIsLoading(false);
            return;
          }

          // Update last login time
          user.updateLastLogin();
          await updateDoc(doc(db, 'users', firebaseUser.uid), {
            lastLoginAt: user.lastLoginAt,
            updatedAt: user.updatedAt
          });

          // Navigate to user interface
          navigation.reset({
            index: 0,
            routes: [{ name: 'UserTabNavigator' }],
          });
        } else {
          // User document doesn't exist in users collection
          Alert.alert('Error', 'Bidder account not found. Please sign up first.');
          await auth.signOut();
        }

      } else {
        // Admin login logic - check admin collection
        const db = getFirestore();
        const adminDoc = await getDoc(doc(db, 'admin', firebaseUser.uid));
        
        if (adminDoc.exists()) {
          const adminData = adminDoc.data();
          
          // Check if user has admin privileges
          if (adminData.isAdmin === true) {
            // Navigate to admin interface
            navigation.reset({
              index: 0,
              routes: [{ name: 'AdminTabNavigator' }],
            });
          } else {
            Alert.alert('Access Denied', 'You do not have admin privileges.');
            await auth.signOut();
          }
        } else {
          Alert.alert('Access Denied', 'Admin account not found.');
          await auth.signOut();
        }
      }

    } catch (error) {
      let message = 'Login failed. Please check your credentials.';
      
      // Handle specific Firebase errors
      if (error.code === 'auth/user-not-found') {
        message = 'No account found with this email address.';
      } else if (error.code === 'auth/wrong-password') {
        message = 'Incorrect password. Please try again.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Please enter a valid email address.';
      } else if (error.code === 'auth/user-disabled') {
        message = 'This account has been disabled.';
      } else if (error.code === 'auth/network-request-failed') {
        message = 'Network error. Please check your internet connection.';
      }
      
      Alert.alert('Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} scrollEnabled={false}>
      {/* Title Section */}
      <View style={styles.titleWrapper}>
        <Text style={styles.subtitle}>Welcome to Silent Auction</Text>
      </View>

      {/* Tab Section */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'Bidder' && styles.activeTab]}
          onPress={() => setActiveTab('Bidder')}
        >
          <Text style={[styles.tabText, activeTab === 'Bidder' && styles.activeTabText]}>
            Bidder
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'Admin' && styles.activeTab]}
          onPress={() => setActiveTab('Admin')}
        >
          <Text style={[styles.tabText, activeTab === 'Admin' && styles.activeTabText]}>
            Admin
          </Text>
        </TouchableOpacity>
      </View>

      {/* Input Fields */}
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.inputBox}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          returnKeyType="next"
        />
      </View>

      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.inputBox}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          returnKeyType="done"
        />
      </View>
      
      {/* Forgot Password */}
      <View style={styles.forgotPasswordWrapper}>
        <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
      </View>

      {/* Sign In Button */}
      <View style={styles.buttonWrapper}>
        <TouchableOpacity 
          style={[styles.signInButton, isLoading && styles.disabledButton]} 
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={Colors.TEXT_BLACK} size="small" />
          ) : (
            <Text style={styles.signInText}>
              Sign In {activeTab === 'Admin' ? 'as Admin' : 'as Bidder'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Create Account Option (Only for Bidder) */}
      {activeTab === 'Bidder' && (
        <View style={styles.footerContainer}>
          <TouchableOpacity onPress={() => navigation.navigate('SignupScreen')}>
            <Text style={styles.footerText}>Don't have an account? Sign Up</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: Colors.BACKGROUND_WHITE,
    alignItems: 'flex-start',
    paddingTop: 30,
    marginTop: 50,
    width: '100%',
    minHeight: '100%',
  },
  titleWrapper: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  subtitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.TEXT_BLACK,
    textAlign: 'center',
  },
  tabContainer: {
    width: '100%',
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: Colors.BACKGROUND_LIGHT_GREEN,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activeTab: {
    backgroundColor: Colors.PRIMARY_GREEN,
    borderColor: Colors.PRIMARY_GREEN,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.TEXT_GRAY,
  },
  activeTabText: {
    color: Colors.TEXT_BLACK,
    fontWeight: '700',
  },
  inputWrapper: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputBox: {
    width: '100%',
    height: 56,
    backgroundColor: Colors.BACKGROUND_LIGHT_GREEN,
    borderRadius: 8,
    padding: 16,
    justifyContent: 'center',
    fontSize: 16,
    color: Colors.TEXT_BLACK,
  },
  forgotPasswordWrapper: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: Colors.TEXT_GRAY,
    textAlign: 'left',
  },
  buttonWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
    width: '100%',
    height: 72,
  },
  signInButton: {
    width: '100%',
    height: 48,
    backgroundColor: Colors.PRIMARY_GREEN,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  signInText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.TEXT_BLACK,
    textAlign: 'center',
  },
  footerContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 8,
  },
  footerText: {
    fontSize: 14,
    color: Colors.TEXT_GRAY,
    textAlign: 'center',
  },
});
