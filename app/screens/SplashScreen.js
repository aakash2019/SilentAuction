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

    useEffect(() => {
        checkAuthState();
    }, []);

    const checkAuthState = () => {
        
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            try {
                if (user) {
                    
                    // Check if user is an admin
                    const adminDoc = await getDoc(doc(db, 'admin', user.uid));
                    
                    if (adminDoc.exists() && adminDoc.data().isAdmin === true) {
                        setTimeout(() => {
                            navigation.replace('AdminTabNavigator');
                        }, 500);
                    } else {
                        // Check if user exists in users collection
                        const userDoc = await getDoc(doc(db, 'users', user.uid));
                        
                        if (userDoc.exists()) {
                            setTimeout(() => {
                                navigation.replace('UserTabNavigator');
                            }, 500);
                        } else {
                            // User authenticated but no profile found
                            setTimeout(() => {
                                navigation.replace('LoginScreen');
                            }, 500);
                        }
                    }
                } else {
                    // No user logged in
                    setLoadingText('Redirecting to Login...');
                    setTimeout(() => {
                        navigation.replace('LoginScreen');
                    }, 1000);
                }
            } catch (error) {
                console.error('Error checking auth state:', error);
                setLoadingText('Error occurred, redirecting...');
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
            <Text style={styles.title}>Silent Auction</Text>
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