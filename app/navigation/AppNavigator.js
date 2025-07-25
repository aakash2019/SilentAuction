import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import SplashScreen from '../screens/SplashScreen';
import AdminTabNavigator from './AdminTabNavigator';
import UserTabNavigator from './UserTabNavigator';

import AdminLoginScreen from '../screens/admin/AdminLoginScreen';
import SettingsScreen from '../screens/admin/SettingsScreen';
import DashboardScreen from '../screens/admin/DashboardScreen';
import ListingsScreen from '../screens/admin/Listings/ListingsScreen';
import UsersScreen from '../screens/admin/UsersScreen';
import AddItemScreen from '../screens/admin/AddItemScreen';
import EditItemScreen from '../screens/admin/Listings/EditItemScreen';
import ItemScreen from '../screens/admin/Listings/ItemScreen'; 

import LoginScreen from '../screens/user/LoginScreen';
import SignUpScreen from '../screens/user/SignupScreen';
import HomeScreen from '../screens/user/HomeScreen';
import BidScreen from '../screens/user/BidScreen';
import SearchScreen from '../screens/user/SearchScreen';
import ProfileScreen from '../screens/user/ProfileScreen';
import UserItemScreen from '../screens/user/UserItemScreen';

const Stack = createStackNavigator();

const AppNavigator = () => (
  <Stack.Navigator initialRouteName="SplashScreen" screenOptions={{ headerShown: false }}>
    <Stack.Screen name="SplashScreen" component={SplashScreen} />
    <Stack.Screen name="AdminTabNavigator" component={AdminTabNavigator} />
    <Stack.Screen name="UserTabNavigator" component={UserTabNavigator} />
    <Stack.Screen name="AdminLoginScreen" component={AdminLoginScreen} />
    <Stack.Screen name="DashboardScreen" component={DashboardScreen} />
    <Stack.Screen name="ListingsScreen" component={ListingsScreen} />
    <Stack.Screen name="UsersScreen" component={UsersScreen} />
    <Stack.Screen name="SettingsScreen" component={SettingsScreen} />
    <Stack.Screen name="AddItemScreen" component={AddItemScreen} />
    <Stack.Screen name="EditItemScreen" component={EditItemScreen} />
    <Stack.Screen name="ItemScreen" component={ItemScreen} />
    <Stack.Screen name="LoginScreen" component={LoginScreen} />
    <Stack.Screen name="SignupScreen" component={SignUpScreen} />
    <Stack.Screen name="HomeScreen" component={HomeScreen} />
    <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
    <Stack.Screen name="BidScreen" component={BidScreen} />
    <Stack.Screen name="SearchScreen" component={SearchScreen} />
    <Stack.Screen name="UserItemScreen" component={UserItemScreen} />
  </Stack.Navigator>
);

export default AppNavigator;