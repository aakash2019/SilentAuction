import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../constants/Colors';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const SplashScreen = () => {
    const navigation = useNavigation();
    const [isLoading, setIsLoading] = useState(true);
    const [loadingText, setLoadingText] = useState('Loading...');
    const [hasNavigated, setHasNavigated] = useState(false);

    useEffect(() => {
        checkAuthState();
    }, []);

    const checkAuthState = () => {
        
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            // Only run authentication logic if we haven't navigated yet
            if (hasNavigated) {
                return;
            }
            try {
                if (user) {
                    
                    // Check both users and admin collections to determine user type
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    const adminDoc = await getDoc(doc(db, 'admin', user.uid));
                    
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        
                        // Check if user has admin privileges in users collection
                        if (userData.isAdmin === true) {
                            // This is an admin user - navigate directly to admin dashboard
                            setHasNavigated(true);
                            setTimeout(() => {
                                navigation.replace('AdminTabNavigator');
                            }, 500);
                        } else {
                            // Regular user - navigate to user interface
                            setHasNavigated(true);
                            setTimeout(() => {
                                navigation.replace('UserTabNavigator');
                            }, 500);
                        }
                    } else if (adminDoc.exists()) {
                        const adminData = adminDoc.data();
                        
                        // User exists in admin collection - check if they have admin privileges
                        if (adminData.isAdmin === true) {
                            // Navigate directly to admin dashboard
                            setHasNavigated(true);
                            setTimeout(() => {
                                navigation.replace('AdminTabNavigator');
                            }, 500);
                        } else {
                            // Admin document exists but no admin privileges - sign out
                            await auth.signOut();
                            setHasNavigated(true);
                            setTimeout(() => {
                                navigation.replace('LoginScreen');
                            }, 500);
                        }
                    } else {
                        // User authenticated but no profile found in either collection
                        // Sign them out and redirect to login
                        await auth.signOut();
                        setHasNavigated(true);
                        setTimeout(() => {
                            navigation.replace('LoginScreen');
                        }, 500);
                    }
                } else {
                    // No user logged in
                    setLoadingText('Loading...');
                    setHasNavigated(true);
                    setTimeout(() => {
                        navigation.replace('LoginScreen');
                    }, 1000);
                }
            } catch (error) {
                setLoadingText('Error occurred, redirecting...');
                setHasNavigated(true);
                setTimeout(() => {
                    navigation.replace('LoginScreen');
                }, 1000);
            } finally {
                setIsLoading(false);
            }
        });

        // Cleanup subscription
        return () => unsubscribe();
    };

    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color={Colors.PRIMARY_GREEN} />
            <Text style={styles.loadingText}>{loadingText}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.BACKGROUND_WHITE,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 30,
        color: Colors.PRIMARY_GREEN,
    },
    loadingText: {
        fontSize: 16,
        color: Colors.TEXT_GRAY,
        marginTop: 20,
        textAlign: 'center',
    },
});

export default SplashScreen;
