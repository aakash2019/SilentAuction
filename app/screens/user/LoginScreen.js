import React, {useState} from 'react';
import { createNavigationContainerRef, useNavigation } from '@react-navigation/native';
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
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Colors } from '../../constants/Colors';
import User from '../../models/User';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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

      // Get user data from Firestore
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      
      if (userDoc.exists()) {
        // Create User model instance
        const user = User.fromFirestore(userDoc);
        
        // Check if account is active
        if (!user.isAccountActive()) {
          Alert.alert('Account Disabled', 'Your account has been disabled. Please contact support.');
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

        console.log('User logged in successfully:', {
          uid: user.uid,
          name: user.getDisplayName(),
          isAdmin: user.hasAdminPrivileges()
        });

        // Navigate based on user type
        if (user.hasAdminPrivileges()) {
          navigation.reset({
            index: 0,
            routes: [{ name: 'AdminTabNavigator' }],
          });
        } else {
          navigation.reset({
            index: 0,
            routes: [{ name: 'UserTabNavigator' }],
          });
        }
      } else {
        // User document doesn't exist in Firestore
        Alert.alert('Error', 'User data not found. Please contact support.');
        await auth.signOut();
      }

    } catch (error) {
      console.error('Login error:', error);
      
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
      } else if (error.code === 'auth/too-many-requests') {
        message = 'Too many failed attempts. Please try again later.';
      }
      
      Alert.alert('Login Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  

  return (
    <ScrollView contentContainerStyle={styles.container} scrollEnabled={false}>
      

      {/* Title Section */}
      <View style={styles.titleWrapper}>
        <Text style={styles.subtitle}>Welcome to Silent Auction</Text>
        <Text style={styles.description}>Log In</Text>
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
          style={styles.signInButton} 
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={Colors.WHITE} size="small" />
          ) : (
            <Text style={styles.signInText}>Sign In</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Footer Links */}     
      <View style={styles.footerContainer}>
        <TouchableOpacity onPress={() => navigation.navigate('SignupScreen')}>
          <Text style={styles.footerText}>Don't have an account? Sign Up</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footerContainer}>
        <TouchableOpacity onPress={() => navigation.navigate('AdminLoginScreen')}>
          <Text style={styles.footerText}>Sign in as Admin</Text>
        </TouchableOpacity>
      </View>
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
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: Colors.BACKGROUND_WHITE,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vectorIcon: {
    width: 24,
    height: 24,
    backgroundColor: Colors.TEXT_BLACK,
  },
  titleWrapper: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.TEXT_BLACK,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.TEXT_BLACK,
    textAlign: 'center',
    paddingBottom: 4,
  },
  description: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.TEXT_BLACK,
    textAlign: 'center',
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
  },
  inputLabel: {
    fontSize: 16,
    color: Colors.TEXT_GRAY,
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
