import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StatusBar, Image, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { API_BASE_URL } from '../../constants/api';

interface LogItem {
  log_id: number;
  job_uuid: string;
  device_serial: string;
  status: string;
  result_text: string;
  image_path: string;
  audio_path: string;
  created_at: string;
}

function getTagStyle(status: string) {
  if (status === 'failed') return { tagColor: '#D97706', tagBg: '#FFFBEB', tag: 'WARNING' };
  return { tagColor: '#1A56DB', tagBg: '#EFF6FF', tag: 'INFO' };
}

function formatTime(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}

export default function ActivityScreen() {
  const { user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);

  const deviceSerial = user?.device_serial || 'SE-2026-X00';

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/logs/${deviceSerial}?limit=20`);
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      setLogs(data);
    } catch (e) {
      console.error('Fetch logs error:', e);
    } finally {
      setLoading(false);
    }
  }, [deviceSerial]);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLogs();
    setRefreshing(false);
  };

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View className="bg-white pt-14 px-5 pb-4 border-b border-gray-200 flex-row justify-between items-center">
        <View>
          <Text className="text-lg font-bold text-gray-900">Recent Events Logs</Text>
          <Text className="text-xs text-gray-500 mt-0.5">Real-time AI analysis feed</Text>
        </View>
        <Ionicons name="time-outline" size={24} color="#1A56DB" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#1A56DB']}
          />
        }
      >
        <View className="pb-6">

          {/* Loading */}
          {loading && (
            <Text className="text-center text-gray-400 mt-8 text-sm">
              กำลังโหลด...
            </Text>
          )}

          {/* Empty */}
          {!loading && logs.length === 0 && (
            <View className="items-center mt-16">
              <Ionicons name="time-outline" size={48} color="#D1D5DB" />
              <Text className="text-gray-400 mt-3 text-sm">ยังไม่มีเหตุการณ์</Text>
              <Text className="text-gray-300 text-xs mt-1">{deviceSerial}</Text>
            </View>
          )}

          {/* Logs from API */}
          {logs.map((log) => {
            const { tag, tagColor, tagBg } = getTagStyle(log.status);
            const imageUrl = log.image_path
              ? `${API_BASE_URL}/image/${log.job_uuid}`
              : null;

            return (
              <View
                key={log.log_id}
                className="flex-row bg-white mx-4 mt-3 rounded-xl overflow-hidden border border-gray-200"
              >
                {/* Thumbnail */}
                {imageUrl ? (
                  <Image
                    source={{ uri: imageUrl }}
                    style={{ width: 80, height: 90 }}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={{ width: 80, height: 90 }}
                    className="bg-gray-100 items-center justify-center"
                  >
                    <Ionicons name="image-outline" size={24} color="#9CA3AF" />
                  </View>
                )}

                {/* Content */}
                <View className="flex-1 p-2.5">
                  {/* Top row */}
                  <View className="flex-row items-center mb-1">
                    <Text className="text-xs text-gray-400 mr-2">
                      {formatTime(log.created_at)}
                    </Text>
                    <View
                      className="px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: tagBg }}
                    >
                      <Text className="text-xs font-bold" style={{ color: tagColor }}>
                        {tag}
                      </Text>
                    </View>
                    <View className="flex-1" />
                    <View className="flex-row items-center">
                      <Ionicons name="send-outline" size={11} color="#9CA3AF" />
                      <Text className="text-xs text-gray-400 ml-0.5">Sent</Text>
                    </View>
                  </View>

                  {/* Result text */}
                  <Text className="text-sm font-medium text-gray-900 leading-5">
                    {log.result_text || 'ไม่มีข้อมูล'}
                  </Text>

                  {/* View Details */}
                  <TouchableOpacity className="flex-row items-center mt-2">
                    <Ionicons name="eye-outline" size={12} color="#6B7280" />
                    <Text className="text-xs text-gray-500 ml-1">View Details</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

        </View>
      </ScrollView>
    </View>
  );
}