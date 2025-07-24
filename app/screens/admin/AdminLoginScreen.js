import React, { useState } from 'react';
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
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';

import { auth } from '../../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { Colors } from '../../constants/Colors';

export default function AdminLoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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

    try {
      // First, authenticate with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Then, check if the user is an admin in the admin collection
      const db = getFirestore();
      const adminDoc = await getDoc(doc(db, 'admin', user.uid));

      if (adminDoc.exists()) {
        const adminData = adminDoc.data();
        
        // Check if the user has admin privileges
        if (adminData.isAdmin === true) {
          // Admin login successful
          navigation.reset({
            index: 0,
            routes: [{ name: 'AdminTabNavigator' }],
          });
        } else {
          // User exists in admin collection but doesn't have admin privileges
          Alert.alert('Access Denied', 'You do not have admin privileges.');
        }
      } else {
        // User authenticated but not found in admin collection
        Alert.alert('Access Denied', 'Admin account not found. Please contact support.');
      }
    } catch (error) {
      console.log('Admin login error:', error.code, error.message);
      let message = 'Login failed. Please check your credentials.';
      
      Alert.alert('Error', message);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView 
          contentContainerStyle={styles.container} 
          scrollEnabled={false}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Title Section */}
          <View style={styles.titleWrapper}>
            <Text style={styles.subtitle}>Admin Sign In</Text>
            <Text style={styles.description}>Please enter your admin credentials</Text>
          </View>

          {/* Input Fields */}
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.inputBox}
              placeholder="Admin Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
              autoCorrect={false}
              autoComplete="email"
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
              autoCorrect={false}
              autoComplete="password"
            />
          </View>

          {/* Forgot Password */}
          <View style={styles.forgotPasswordWrapper}>
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </View>

          {/* Sign In Button */}
          <View style={styles.buttonWrapper}>
            <TouchableOpacity style={styles.signInButton} onPress={handleLogin}>
              <Text style={styles.signInText}>Sign In</Text>
            </TouchableOpacity>
          </View>

          {/* Footer Link */}
          <View style={styles.footerContainer}>
            <TouchableOpacity onPress={() => navigation.navigate('LoginScreen')}>
              <Text style={styles.footerText}>Sign in as User</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: Colors.BACKGROUND_WHITE,
    alignItems: 'flex-start',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 30,
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
    fontSize: 16,
    fontWeight: '400',
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
    fontSize: 16,
    color: Colors.TEXT_BLACK,
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
