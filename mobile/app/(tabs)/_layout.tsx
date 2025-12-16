import React from 'react';
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const TabsLayout = () => (
  <Tabs
    screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: '#1E40AF',
    }}
  >
    <Tabs.Screen
      name="home"
      options={{
        title: 'Home',
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons name="newspaper" color={color} size={size} />
        ),
      }}
    />
    <Tabs.Screen
      name="profile"
      options={{
        title: 'Profile',
        tabBarIcon: ({ color, size }) => (
<<<<<<< ours
          <MaterialCommunityIcons name="account" color={color} size={size} />
=======
          <MaterialCommunityIcons name="magnify" color={color} size={size} />
        ),
      }}
    />
    <Tabs.Screen
      name="saved"
      options={{
        title: 'Saved',
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons name="bookmark-outline" color={color} size={size} />
>>>>>>> theirs
        ),
      }}
    />
    <Tabs.Screen
      name="settings"
      options={{
        title: 'Settings',
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons name="cog" color={color} size={size} />
        ),
      }}
    />
  </Tabs>
);

export default TabsLayout;
