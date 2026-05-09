import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Switch, StatusBar, Alert, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [pushNotif, setPushNotif] = useState(true);
  const [highContrast, setHighContrast] = useState(false);
  const [largeText, setLargeText] = useState(false);

  const initials = (user?.full_name || 'S')
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      // Alert.alert ไม่ทำงานบน web — ใช้ window.confirm แทน
      const confirmed = window.confirm('Are you sure you want to sign out?');
      if (confirmed) {
        logout();
        window.location.href = '/';
      }
    } else {
      Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => logout(),
        },
      ]);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View className="bg-white pt-14 px-5 pb-4 border-b border-gray-200">
        <Text className="text-xl font-bold text-gray-900">Settings</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Profile Card */}
        <TouchableOpacity className="bg-white mx-4 mt-4 rounded-xl p-4 border border-gray-200 flex-row items-center">
          <View className="w-11 h-11 rounded-full bg-blue-100 items-center justify-center mr-3">
            <Text className="text-base font-bold text-blue-600">{initials}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-gray-900">
              {user?.full_name || 'Somsri konthai'}
            </Text>
            <Text className="text-xs text-gray-500 mt-0.5">Caregiver Account</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        {/* Notifications */}
        <Text className="text-xs font-semibold text-gray-400 px-5 pt-5 pb-1 tracking-wide">
          NOTIFICATIONS
        </Text>
        <View className="bg-white mx-4 rounded-xl border border-gray-200 overflow-hidden">
          <View className="flex-row items-center justify-between p-3.5">
            <View className="flex-row items-center flex-1">
              <View className="w-8 h-8 rounded-lg bg-blue-50 items-center justify-center">
                <Ionicons name="notifications-outline" size={17} color="#1A56DB" />
              </View>
              <View className="ml-3">
                <Text className="text-sm font-medium text-gray-900">Push Notifications</Text>
                <Text className="text-xs text-gray-500 mt-0.5">Alerts for critical events</Text>
              </View>
            </View>
            <Switch
              value={pushNotif}
              onValueChange={setPushNotif}
              trackColor={{ false: '#E5E7EB', true: '#1A56DB' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Accessibility */}
        <Text className="text-xs font-semibold text-gray-400 px-5 pt-5 pb-1 tracking-wide">
          ACCESSIBILITY
        </Text>
        <View className="bg-white mx-4 rounded-xl border border-gray-200 overflow-hidden">
          <View className="flex-row items-center justify-between p-3.5 border-b border-gray-100">
            <View className="flex-row items-center flex-1">
              <View className="w-8 h-8 rounded-lg bg-gray-100 items-center justify-center">
                <Ionicons name="moon-outline" size={17} color="#374151" />
              </View>
              <Text className="text-sm font-medium text-gray-900 ml-3">High Contrast</Text>
            </View>
            <Switch
              value={highContrast}
              onValueChange={setHighContrast}
              trackColor={{ false: '#E5E7EB', true: '#1A56DB' }}
              thumbColor="#FFFFFF"
            />
          </View>
          <View className="flex-row items-center justify-between p-3.5">
            <View className="flex-row items-center flex-1">
              <View className="w-8 h-8 rounded-lg bg-gray-100 items-center justify-center">
                <Ionicons name="text-outline" size={17} color="#374151" />
              </View>
              <Text className="text-sm font-medium text-gray-900 ml-3">Large Text</Text>
            </View>
            <Switch
              value={largeText}
              onValueChange={setLargeText}
              trackColor={{ false: '#E5E7EB', true: '#1A56DB' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Device */}
        <Text className="text-xs font-semibold text-gray-400 px-5 pt-5 pb-1 tracking-wide">
          DEVICE
        </Text>
        <View className="bg-white mx-4 rounded-xl border border-gray-200 overflow-hidden">
          <TouchableOpacity className="flex-row items-center justify-between p-3.5 border-b border-gray-100">
            <View className="flex-row items-center flex-1">
              <View className="w-8 h-8 rounded-lg bg-gray-100 items-center justify-center">
                <Ionicons name="phone-portrait-outline" size={17} color="#374151" />
              </View>
              <View className="ml-3">
                <Text className="text-sm font-medium text-gray-900">Linked Device</Text>
                <Text className="text-xs text-gray-500 mt-0.5">Seeing Eyes Glass v2 (Online)</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>
          <TouchableOpacity className="flex-row items-center justify-between p-3.5">
            <View className="flex-row items-center flex-1">
              <View className="w-8 h-8 rounded-lg bg-gray-100 items-center justify-center">
                <Ionicons name="shield-outline" size={17} color="#374151" />
              </View>
              <Text className="text-sm font-medium text-gray-900 ml-3">Privacy & Security</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          className="flex-row items-center justify-center mx-4 mt-4 p-4 bg-white rounded-xl border border-red-100 gap-2"
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          <Text className="text-base font-semibold text-red-500">Sign Out</Text>
        </TouchableOpacity>

        <Text className="text-center text-xs text-gray-400 mt-4 mb-8">
          Version 1.0.4 (Build 2025)
        </Text>

      </ScrollView>
    </View>
  );
}