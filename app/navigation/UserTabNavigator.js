// navigation/BottomTabNavigator.js
import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors } from '../constants/Colors';
import HomeScreen from '../screens/user/HomeScreen';
import ProfileScreen from '../screens/user/ProfileScreen';
import SearchScreen from '../screens/user/SearchScreen';
import BidScreen from '../screens/user/BidScreen';

const Tab = createBottomTabNavigator();

export default function UserTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size, focused }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Search') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'Bid') {
            iconName = focused ? 'pricetag' : 'pricetag-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: Colors.PRIMARY_GREEN,
        tabBarInactiveTintColor: Colors.GRAY,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: 'normal',
        },
        tabBarStyle: {
          paddingBottom: 5,
          paddingTop: 5,
          height: 80,
          marginBottom: 20
        },
        // Make active tab label bold
        tabBarItemStyle: {
          paddingVertical: 5,
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          tabBarLabel: ({ focused }) => (
            <Text style={{
              fontSize: 12,
              fontWeight: focused ? 'bold' : 'normal',
              color: focused ? Colors.PRIMARY_GREEN : Colors.GRAY,
            }}>
              Home
            </Text>
          ),
        }}
      />
      <Tab.Screen 
        name="Search" 
        component={SearchScreen}
        options={{
          tabBarLabel: ({ focused }) => (
            <Text style={{
              fontSize: 12,
              fontWeight: focused ? 'bold' : 'normal',
              color: focused ? Colors.PRIMARY_GREEN : Colors.GRAY,
            }}>
              Search
            </Text>
          ),
        }}
      />
      <Tab.Screen 
        name="Bid" 
        component={BidScreen}
        options={{
          tabBarLabel: ({ focused }) => (
            <Text style={{
              fontSize: 12,
              fontWeight: focused ? 'bold' : 'normal',
              color: focused ? Colors.PRIMARY_GREEN : Colors.GRAY,
            }}>
              Bid
            </Text>
          ),
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          tabBarLabel: ({ focused }) => (
            <Text style={{
              fontSize: 12,
              fontWeight: focused ? 'bold' : 'normal',
              color: focused ? Colors.PRIMARY_GREEN : Colors.GRAY,
            }}>
              Profile
            </Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}
