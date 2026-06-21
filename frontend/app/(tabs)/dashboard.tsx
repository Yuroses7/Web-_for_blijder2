import React from 'react';
import {
  View, Text, ScrollView,
  TouchableOpacity, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useAccessibilityStore } from '../../store/accessibilityStore';

const NAVBAR_COLOR = '#0D3B2E';
const BRAND_COLOR  = '#0D6E4F';

function getInitial(fullName?: string): string {
  if (!fullName) return '?';
  return fullName.trim().charAt(0).toUpperCase();
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const { highContrast, largeText } = useAccessibilityStore();

  const fullName          = user?.full_name || 'ผู้ใช้งาน';
  const disabilityDetails = user?.disability_details;
  const emergencyContact  = user?.emergency_contact;
  const deviceSerial      = user?.device_serial;

  // ── สีตาม highContrast ──────────────────────────────────────
  const pageBg       = highContrast ? '#000000' : '#F8FAFC'; // slate-50
  const cardBg       = highContrast ? '#0A0A0A' : '#FFFFFF';
  const cardBorder   = highContrast ? '#FFFFFF' : '#E2E8F0'; // slate-200
  const textPrimary  = highContrast ? '#FFFFFF' : NAVBAR_COLOR;
  const textSecondary= highContrast ? '#D1D5DB' : '#64748B'; // slate-500
  const textMuted    = highContrast ? '#9CA3AF' : '#94A3B8'; // slate-400
  const iconMuted    = highContrast ? '#FFFFFF' : '#94A3B8';
  const dividerColor = highContrast ? '#262626' : '#F1F5F9'; // slate-100

  // ── ขนาดตัวอักษรตาม largeText ────────────────────────────────
  const greetingSize = largeText ? 'text-base' : 'text-sm';
  const nameSize      = largeText ? 'text-3xl' : 'text-2xl';
  const cardNameSize  = largeText ? 'text-lg' : 'text-base';
  const badgeSize     = largeText ? 'text-sm' : 'text-xs';
  const captionSize   = largeText ? 'text-sm' : 'text-xs';
  const rowLabelSize  = largeText ? 'text-base' : 'text-sm';
  const sectionTitleSize = largeText ? 'text-lg' : 'text-base';

  return (
    <View style={{ flex: 1, backgroundColor: pageBg }}>
      <StatusBar barStyle="light-content" backgroundColor={NAVBAR_COLOR} />

      {/* Header */}
      <View
        className="pt-14 px-5 pb-5 flex-row justify-between items-center"
        style={{ backgroundColor: NAVBAR_COLOR }}
      >
        <View className="flex-1">
          <Text className={`${greetingSize} text-white/60 font-medium`}>ยินดีต้อนรับกลับ</Text>
          <Text className={`${nameSize} font-bold text-white mt-0.5`}>
            {fullName}
          </Text>
        </View>
        <TouchableOpacity
          className="w-11 h-11 rounded-full items-center justify-center bg-white/15 border border-white/25"
          accessibilityLabel="โปรไฟล์ผู้ใช้"
          accessibilityRole="button"
        >
          <Text className="text-white text-base font-bold">{getInitial(fullName)}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Patient Card */}
        <View
          className="mx-4 mt-4 rounded-2xl p-4 border"
          style={{ backgroundColor: cardBg, borderColor: cardBorder }}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <View
                className="items-center justify-center"
                style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: highContrast ? '#FFFFFF' : NAVBAR_COLOR }}
              >
                <Text className="text-xl font-bold" style={{ color: highContrast ? '#000000' : '#FFFFFF' }}>
                  {getInitial(fullName)}
                </Text>
              </View>
              <View className="flex-1 ml-3">
                <Text className={`${cardNameSize} font-semibold`} style={{ color: textPrimary }}>
                  {fullName}
                </Text>
                {disabilityDetails ? (
                  <View className="flex-row items-center mt-1">
                    <View
                      className="px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: highContrast ? '#3A2E00' : '#B8860B1A' }}
                    >
                      <Text className={`${badgeSize} font-semibold`} style={{ color: highContrast ? '#FFD166' : '#9A6B0C' }}>
                        {disabilityDetails}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text className={`${captionSize} mt-1`} style={{ color: textMuted }}>
                    ยังไม่มีข้อมูลภาวะสายตา
                  </Text>
                )}
                <View className="flex-row items-center mt-2">
                  <Ionicons name="call-outline" size={12} color={textSecondary} />
                  <Text className={`${captionSize} ml-1`} style={{ color: textSecondary }}>
                    {emergencyContact ? `ติดต่อฉุกเฉิน: ${emergencyContact}` : 'ยังไม่มีเบอร์ติดต่อฉุกเฉิน'}
                  </Text>
                </View>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={iconMuted} />
          </View>
        </View>

        {/* Device Status Card */}
        <View
          className="mx-4 mt-3 rounded-2xl p-4 border"
          style={{ backgroundColor: cardBg, borderColor: cardBorder }}
        >
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center flex-1">
              <View
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: deviceSerial ? (highContrast ? '#063B2A' : `${BRAND_COLOR}14`) : (highContrast ? '#1F1F1F' : '#F1F5F9') }}
              >
                <Ionicons
                  name={deviceSerial ? 'wifi' : 'wifi-outline'}
                  size={18}
                  color={deviceSerial ? (highContrast ? '#34D399' : BRAND_COLOR) : iconMuted}
                />
              </View>
              <View className="ml-3">
                <Text className={`${rowLabelSize} font-semibold`} style={{ color: textPrimary }}>
                  {deviceSerial ? 'เชื่อมต่ออุปกรณ์แล้ว' : 'ยังไม่ได้เชื่อมต่ออุปกรณ์'}
                </Text>
                <Text className={`${captionSize} mt-0.5`} style={{ color: textSecondary }}>
                  {deviceSerial || 'ไม่มีอุปกรณ์ที่ลงทะเบียน'}
                </Text>
              </View>
            </View>
            <Text className={`${captionSize} font-semibold tracking-wide`} style={{ color: textMuted }}>
              สถานะอุปกรณ์
            </Text>
          </View>
        </View>

        {/* Account Info */}
        <View
          className="mx-4 mt-3 mb-6 rounded-2xl p-4 border"
          style={{ backgroundColor: cardBg, borderColor: cardBorder }}
        >
          <View className="flex-row items-center mb-3.5">
            <Ionicons name="person-outline" size={18} color={highContrast ? '#34D399' : BRAND_COLOR} />
            <Text className={`${sectionTitleSize} font-semibold ml-1.5`} style={{ color: textPrimary }}>
              ข้อมูลบัญชี
            </Text>
          </View>

          <View className="flex-row items-center py-2.5 border-t" style={{ borderColor: dividerColor }}>
            <Ionicons name="at-outline" size={16} color={textSecondary} />
            <Text className={`${rowLabelSize} ml-2 flex-1`} style={{ color: textSecondary }}>ชื่อผู้ใช้</Text>
            <Text className={`${rowLabelSize} font-semibold`} style={{ color: textPrimary }}>
              {user?.username || '—'}
            </Text>
          </View>

          <View className="flex-row items-center py-2.5 border-t" style={{ borderColor: dividerColor }}>
            <Ionicons name="shield-checkmark-outline" size={16} color={textSecondary} />
            <Text className={`${rowLabelSize} ml-2 flex-1`} style={{ color: textSecondary }}>บทบาท</Text>
            <View className="px-2.5 py-1 rounded-full" style={{ backgroundColor: highContrast ? '#1F1F1F' : `${NAVBAR_COLOR}10` }}>
              <Text className={`${badgeSize} font-semibold`} style={{ color: textPrimary }}>
                {user?.role === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้ดูแล'}
              </Text>
            </View>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}