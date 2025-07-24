// navigation/AdminTabNavigator.js
import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors } from '../constants/Colors';
import DashboardScreen from '../screens/admin/DashboardScreen';
import ListingsScreen from '../screens/admin/Listings/ListingsScreen';
import UsersScreen from '../screens/admin/UsersScreen';
import SettingsScreen from '../screens/admin/SettingsScreen';

const Tab = createBottomTabNavigator();

export default function AdminTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size, focused }) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'speedometer' : 'speedometer-outline';
          } else if (route.name === 'Listings') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Users') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
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
        name="Dashboard" 
        component={DashboardScreen}
        options={{
          tabBarLabel: ({ focused }) => (
            <Text style={{
              fontSize: 12,
              fontWeight: focused ? 'bold' : 'normal',
              color: focused ? Colors.PRIMARY_GREEN : Colors.GRAY,
            }}>
              Dashboard
            </Text>
          ),
        }}
      />
      <Tab.Screen 
        name="Listings" 
        component={ListingsScreen}
        options={{
          tabBarLabel: ({ focused }) => (
            <Text style={{
              fontSize: 12,
              fontWeight: focused ? 'bold' : 'normal',
              color: focused ? Colors.PRIMARY_GREEN : Colors.GRAY,
            }}>
              Listings
            </Text>
          ),
        }}
      />
      <Tab.Screen 
        name="Users" 
        component={UsersScreen}
        options={{
          tabBarLabel: ({ focused }) => (
            <Text style={{
              fontSize: 12,
              fontWeight: focused ? 'bold' : 'normal',
              color: focused ? Colors.PRIMARY_GREEN : Colors.GRAY,
            }}>
              Users
            </Text>
          ),
        }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          tabBarLabel: ({ focused }) => (
            <Text style={{
              fontSize: 12,
              fontWeight: focused ? 'bold' : 'normal',
              color: focused ? Colors.PRIMARY_GREEN : Colors.GRAY,
            }}>
              Settings
            </Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}
