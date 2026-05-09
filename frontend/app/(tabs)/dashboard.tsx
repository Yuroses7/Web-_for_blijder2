import React from 'react';
import {
  View, Text, ScrollView,
  TouchableOpacity, StatusBar, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';

export default function Dashboard() {
  const { user } = useAuthStore();

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View className="bg-white pt-14 px-5 pb-4 border-b border-gray-200 flex-row justify-between items-center">
        <View>
          <Text className="text-sm text-gray-500">Welcome back,</Text>
          <Text className="text-2xl font-bold text-gray-900">
            {user?.full_name || 'Somsri'}
          </Text>
        </View>
        <TouchableOpacity className="p-1">
          <Ionicons name="person-circle-outline" size={36} color="#374151" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Patient Card */}
        <View className="bg-white mx-4 mt-4 rounded-xl p-4 border border-gray-200 flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <Image
              source={{ uri: 'https://i.pravatar.cc/60?img=47' }}
              className="w-13 h-13 rounded-full mr-3"
              style={{ width: 52, height: 52, borderRadius: 26 }}
            />
            <View className="flex-1">
              <Text className="text-base font-semibold text-gray-900">
                Chayanan Ruaysup
              </Text>
              <Text className="text-xs text-red-500 mt-0.5">Macular Degeneration</Text>
              <View className="flex-row items-center mt-1">
                <View className="w-2 h-2 rounded-full bg-green-500 mr-1.5" />
                <Text className="text-xs text-gray-500">Emergency: +1 (555) 0123-4567</Text>
              </View>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </View>

        {/* Live Alert Banner */}
        <View className="bg-orange-50 mx-4 mt-3 rounded-xl p-3.5 border-l-4 border-orange-400">
          <View className="w-2 h-2 rounded-full bg-orange-400 mb-1" />
          <Text className="text-xs font-bold text-orange-700 tracking-wide">
            LIVE ALERT • 2 MINS AGO
          </Text>
          <Text className="text-sm font-semibold text-gray-900 mt-0.5">
            Obstacle detected 2 meters ahead - Car
          </Text>
        </View>

        {/* Status Card */}
        <View className="bg-white mx-4 mt-3 rounded-xl p-4 border border-gray-200">
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center gap-2.5">
              <Ionicons name="wifi" size={20} color="#374151" />
              <View className="ml-2.5">
                <Text className="text-lg font-semibold text-gray-900">Online</Text>
                <Text className="text-xs text-gray-500">SE-2026-X00</Text>
              </View>
            </View>
            <Text className="text-xs text-gray-400 font-semibold">STATUS</Text>
          </View>
        </View>

        {/* Activity Overview */}
        <View className="bg-white mx-4 mt-3 mb-6 rounded-xl p-4 border border-gray-200">
          <View className="flex-row items-center mb-3.5">
            <Ionicons name="pulse" size={18} color="#1A56DB" />
            <Text className="text-base font-semibold text-gray-900 ml-1.5">
              Activity Overview
            </Text>
          </View>

          <View className="flex-row items-center py-2.5 border-t border-gray-100">
            <Ionicons name="calendar-outline" size={16} color="#6B7280" />
            <Text className="text-sm text-gray-500 ml-2 flex-1">Last Active</Text>
            <Text className="text-sm font-semibold text-gray-900">Today, 14:30 PM</Text>
          </View>

          <View className="flex-row items-center py-2.5 border-t border-gray-100">
            <Ionicons name="time-outline" size={16} color="#6B7280" />
            <Text className="text-sm text-gray-500 ml-2 flex-1">Duration</Text>
            <Text className="text-sm font-semibold text-gray-900">2 hrs 15 mins</Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}