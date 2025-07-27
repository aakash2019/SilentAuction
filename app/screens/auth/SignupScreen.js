import React, { useState } from 'react';
import { createNavigationContainerRef, useNavigation } from '@react-navigation/native';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { auth } from '../../firebase';
import { Colors } from '../../constants/Colors';
import User from '../../models/User'; 
import{ View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Platform,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
} from 'react-native';

const { width, height } = Dimensions.get('window');

export default function SignUpScreen() {
  // State for form inputs
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigation = useNavigation();

  // Handle Sign Up button press
  const handleSignUp = async () => {
    // Basic validation
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    // Password validation
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);

    try {
      const db = getFirestore();
      const storage = getStorage();

      // Get default profile image URL
      let defaultProfileImageUrl = null;
      try {
        const defaultImageRef = ref(storage, 'users/1.png');
        defaultProfileImageUrl = await getDownloadURL(defaultImageRef);
      } catch (imageError) {
        // Continue without default image if it fails
      }

      // Create user model for validation
      const newUser = new User({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        isAdmin: false,
        profileImage: defaultProfileImageUrl // Default profile image URL
      });

      // Validate user data
      const validationErrors = newUser.validate();
      if (validationErrors.length > 0) {
        Alert.alert('Validation Error', validationErrors.join('\n'));
        setIsLoading(false);
        return;
      }

      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const firebaseUser = userCredential.user;

      // Update user model with Firebase UID
      newUser.uid = firebaseUser.uid;

      // Update Firebase Auth profile
      await updateProfile(firebaseUser, { 
        displayName: newUser.fullName 
      });

      // Save user to Firestore using User model
      await setDoc(doc(db, 'users', firebaseUser.uid), newUser.toFirestore());


      Alert.alert('Success', 'Account created successfully!', [
        {
          text: 'OK',
          onPress: () => {
            // Clear form
            setFullName('');
            setEmail('');
            setPassword('');
            
            // Navigate to user dashboard
            navigation.reset({
              index: 0,
              routes: [{ name: 'UserTabNavigator' }],
            });
          },
        },
      ]);

    } catch (error) {
      
      // Handle specific Firebase errors
      let errorMessage = 'Failed to create account. Please try again.';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered. Please use a different email or try logging in.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please choose a stronger password.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection.';
      }

      Alert.alert('Sign Up Error', errorMessage);
    } finally {
      setIsLoading(false);
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
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Silent Auction</Text>
            <Text style={styles.subtitle}>Create an Account</Text>
            <Text style={styles.description}>Enter your details to get started</Text>
          </View>

          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.inputBox}
              placeholder="Full Name"
              value={fullName}
              onChangeText={setFullName}
              returnKeyType="next"
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.inputBox}
              placeholder="Email"
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

          <View style={styles.buttonWrapper}>
            <TouchableOpacity 
              style={[styles.signUpButton, isLoading && styles.disabledButton]} 
              onPress={handleSignUp}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={Colors.TEXT_BLACK} />
              ) : (
                <Text style={styles.signUpText}>Sign Up</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footerContainer}>
            <TouchableOpacity onPress={() => navigation.navigate('LoginScreen')}>
              <Text style={styles.footerText}>Already have an account? Sign In</Text>
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
    width: '100%',
    minHeight: '100%',
  },
  headerContainer: {
    width: '100%',
    paddingHorizontal: 16,
    alignItems: 'center',
    paddingBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.TEXT_BLACK,
    textAlign: 'center',
    paddingBottom: 8,
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
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    fontSize: 16,
    color: Colors.TEXT_BLACK,
  },
  buttonWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
    width: '100%',
    height: 72,
  },
  signUpButton: {
    width: '100%',
    height: 48,
    backgroundColor: Colors.PRIMARY_GREEN,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signUpText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.TEXT_BLACK,
    textAlign: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  footerContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 12,
  },
  footerText: {
    fontSize: 14,
    color: Colors.TEXT_LIGHT_GRAY,
    textAlign: 'center',
  },
});
