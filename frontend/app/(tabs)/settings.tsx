import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Switch, StatusBar, Alert, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useAccessibilityStore } from '../../store/accessibilityStore';

const NAVBAR_COLOR = '#0D3B2E';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [pushNotif, setPushNotif] = useState(true);

  // ✅ ใช้ global store แทน useState local — มีผลกับทุกหน้าจอในแอป
  const { highContrast, largeText, setHighContrast, setLargeText } = useAccessibilityStore();

  const initials = (user?.full_name || 'S')
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = () => {
    if (Platform.OS === 'web') {
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

  // สีพื้นหลัง/ตัวอักษรของหน้านี้เอง ก็ต้องตอบสนอง highContrast ด้วยเช่นกัน
  const bgColor       = highContrast ? '#000000' : '#F9FAFB';
  const cardBg        = highContrast ? '#0A0A0A' : '#FFFFFF';
  const cardBorder    = highContrast ? '#FFFFFF' : '#E5E7EB';
  const textPrimary   = highContrast ? '#FFFFFF' : '#111827';
  const textSecondary = highContrast ? '#D1D5DB' : '#6B7280';
  const titleSize     = largeText ? 'text-2xl' : 'text-xl';
  const labelSize     = largeText ? 'text-base' : 'text-sm';
  const captionSize   = largeText ? 'text-sm' : 'text-xs';

  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      <StatusBar barStyle="light-content" backgroundColor={NAVBAR_COLOR} />

      {/* Header */}
      <View className="pt-14 px-5 pb-4" style={{ backgroundColor: NAVBAR_COLOR }}>
        <Text className={`${titleSize} font-bold text-white`}>Settings</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Profile Card */}
        <TouchableOpacity
          className="mx-4 mt-4 rounded-xl p-4 border flex-row items-center"
          style={{ backgroundColor: cardBg, borderColor: cardBorder }}
        >
          <View className="w-11 h-11 rounded-full bg-blue-100 items-center justify-center mr-3">
            <Text className="text-base font-bold text-blue-600">{initials}</Text>
          </View>
          <View className="flex-1">
            <Text className={`${labelSize} font-semibold`} style={{ color: textPrimary }}>
              {user?.full_name || 'Somsri konthai'}
            </Text>
            <Text className={`${captionSize} mt-0.5`} style={{ color: textSecondary }}>
              Caregiver Account
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={textSecondary} />
        </TouchableOpacity>

        {/* Notifications */}
        <Text className={`${captionSize} font-semibold px-5 pt-5 pb-1 tracking-wide`} style={{ color: textSecondary }}>
          NOTIFICATIONS
        </Text>
        <View className="mx-4 rounded-xl border overflow-hidden" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
          <View className="flex-row items-center justify-between p-3.5">
            <View className="flex-row items-center flex-1">
              <View className="w-8 h-8 rounded-lg bg-blue-50 items-center justify-center">
                <Ionicons name="notifications-outline" size={17} color="#1A56DB" />
              </View>
              <View className="ml-3">
                <Text className={`${labelSize} font-medium`} style={{ color: textPrimary }}>
                  Push Notifications
                </Text>
                <Text className={`${captionSize} mt-0.5`} style={{ color: textSecondary }}>
                  Alerts for critical events
                </Text>
              </View>
            </View>
            <Switch
              value={pushNotif}
              onValueChange={setPushNotif}
              trackColor={{ false: '#E5E7EB', true: '#0D6E4F' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Accessibility */}
        <Text className={`${captionSize} font-semibold px-5 pt-5 pb-1 tracking-wide`} style={{ color: textSecondary }}>
          ACCESSIBILITY
        </Text>
        <View className="mx-4 rounded-xl border overflow-hidden" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
          <View className="flex-row items-center justify-between p-3.5 border-b" style={{ borderColor: cardBorder }}>
            <View className="flex-row items-center flex-1">
              <View className="w-8 h-8 rounded-lg items-center justify-center" style={{ backgroundColor: highContrast ? '#1F1F1F' : '#F3F4F6' }}>
                <Ionicons name="moon-outline" size={17} color={textPrimary} />
              </View>
              <View className="ml-3 flex-1">
                <Text className={`${labelSize} font-medium`} style={{ color: textPrimary }}>
                  High Contrast
                </Text>
                <Text className={`${captionSize} mt-0.5`} style={{ color: textSecondary }}>
                  พื้นดำ ตัวอักษรขาว ใช้ทั่วทั้งแอป
                </Text>
              </View>
            </View>
            <Switch
              value={highContrast}
              onValueChange={setHighContrast}
              trackColor={{ false: '#E5E7EB', true: '#0D6E4F' }}
              thumbColor="#FFFFFF"
            />
          </View>
          <View className="flex-row items-center justify-between p-3.5">
            <View className="flex-row items-center flex-1">
              <View className="w-8 h-8 rounded-lg items-center justify-center" style={{ backgroundColor: highContrast ? '#1F1F1F' : '#F3F4F6' }}>
                <Ionicons name="text-outline" size={17} color={textPrimary} />
              </View>
              <View className="ml-3 flex-1">
                <Text className={`${labelSize} font-medium`} style={{ color: textPrimary }}>
                  Large Text
                </Text>
                <Text className={`${captionSize} mt-0.5`} style={{ color: textSecondary }}>
                  ขยายขนาดตัวอักษรทั่วทั้งแอป
                </Text>
              </View>
            </View>
            <Switch
              value={largeText}
              onValueChange={setLargeText}
              trackColor={{ false: '#E5E7EB', true: '#0D6E4F' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Device */}
        <Text className={`${captionSize} font-semibold px-5 pt-5 pb-1 tracking-wide`} style={{ color: textSecondary }}>
          DEVICE
        </Text>
        <View className="mx-4 rounded-xl border overflow-hidden" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
          <TouchableOpacity className="flex-row items-center justify-between p-3.5 border-b" style={{ borderColor: cardBorder }}>
            <View className="flex-row items-center flex-1">
              <View className="w-8 h-8 rounded-lg items-center justify-center" style={{ backgroundColor: highContrast ? '#1F1F1F' : '#F3F4F6' }}>
                <Ionicons name="phone-portrait-outline" size={17} color={textPrimary} />
              </View>
              <View className="ml-3">
                <Text className={`${labelSize} font-medium`} style={{ color: textPrimary }}>
                  Linked Device
                </Text>
                <Text className={`${captionSize} mt-0.5`} style={{ color: textSecondary }}>
                  {user?.device_serial || 'ไม่มีอุปกรณ์ที่เชื่อมต่อ'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity className="flex-row items-center justify-between p-3.5">
            <View className="flex-row items-center flex-1">
              <View className="w-8 h-8 rounded-lg items-center justify-center" style={{ backgroundColor: highContrast ? '#1F1F1F' : '#F3F4F6' }}>
                <Ionicons name="shield-outline" size={17} color={textPrimary} />
              </View>
              <Text className={`${labelSize} font-medium ml-3`} style={{ color: textPrimary }}>
                Privacy & Security
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          className="flex-row items-center justify-center mx-4 mt-4 p-4 rounded-xl border gap-2"
          style={{ backgroundColor: cardBg, borderColor: '#FCA5A5' }}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          <Text className={`${labelSize} font-semibold`} style={{ color: '#EF4444' }}>Sign Out</Text>
        </TouchableOpacity>

        <Text className={`text-center ${captionSize} mt-4 mb-8`} style={{ color: textSecondary }}>
          Version 1.0.4 (Build 2025)
        </Text>

      </ScrollView>
    </View>
  );
}