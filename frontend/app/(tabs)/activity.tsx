import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { API_BASE_URL } from '../../constants/api';
import { useAuthStore } from '../../store/authStore';
import { useAccessibilityStore } from '../../store/accessibilityStore';

const NAVBAR_COLOR = '#0D3B2E';

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

function getTagStyle(status: string, highContrast: boolean) {
  if (status === 'failed') {
    return highContrast
      ? { tagColor: '#FBBF24', tagBg: '#3A2E00', tag: 'WARNING' }
      : { tagColor: '#D97706', tagBg: '#FFFBEB', tag: 'WARNING' };
  }
  return highContrast
    ? { tagColor: '#60A5FA', tagBg: '#0B1F3A', tag: 'INFO' }
    : { tagColor: '#1A56DB', tagBg: '#EFF6FF', tag: 'INFO' };
}

function formatTime(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}

export default function ActivityScreen() {
  const { user } = useAuthStore();
  const { highContrast, largeText } = useAccessibilityStore();
  const [refreshing, setRefreshing] = useState(false);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const prevLogsRef = useRef<LogItem[]>([]);

  const deviceSerial = user?.device_serial || 'Se55';

  // ── สีตาม highContrast ──────────────────────────────────────
  const pageBg        = highContrast ? '#000000' : '#F9FAFB';
  const cardBg         = highContrast ? '#0A0A0A' : '#FFFFFF';
  const cardBorder     = highContrast ? '#FFFFFF' : '#E5E7EB';
  const textPrimary    = highContrast ? '#FFFFFF' : '#0A0A0A';
  const textSecondary  = highContrast ? '#D1D5DB' : '#6B7280';
  const textMuted      = highContrast ? '#9CA3AF' : '#9CA3AF';
  const imgPlaceholderBg = highContrast ? '#1F1F1F' : '#F3F4F6';
  const playerIdleBg   = highContrast ? '#1F1F1F' : '#F9FAFB80';
  const playerIdleBorder = highContrast ? '#3F3F3F' : '#E5E7EB';
  const playerActiveBg = highContrast ? '#0B1F3A' : '#EFF6FFB3';
  const playerActiveBorder = highContrast ? '#60A5FA' : '#BFDBFE';

  // ── ขนาดตัวอักษรตาม largeText ────────────────────────────────
  const titleSize   = largeText ? 'text-2xl' : 'text-xl';
  const subtitleSize= largeText ? 'text-sm' : 'text-xs';
  const captionSize = largeText ? 'text-sm' : 'text-xs';
  const bodySize    = largeText ? 'text-base' : 'text-sm';

  useEffect(() => {
    const initAudioMode = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          playThroughEarpieceAndroid: false,
          staysActiveInBackground: false,
        });
      } catch (error) {
        console.error('Failed to set audio mode:', error);
      }
    };
    initAudioMode();
  }, []);

  const stopSound = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    } catch (e) {
      console.error('Stop sound error:', e);
    } finally {
      setPlayingId(null);
    }
  };

  const playAudio = async (jobUuid: string, logId: number) => {
    await stopSound();
    try {
      const url = `${API_BASE_URL}/audio/${jobUuid}`;
      console.log('🔊 กำลังส่งเสียงเตือนอัตโนมัติจาก:', url);

      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true }
      );

      soundRef.current = sound;
      setPlayingId(logId);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingId(null);
          sound.unloadAsync();
          soundRef.current = null;
        }
      });
    } catch (e) {
      console.error('❌ Audio play error:', e);
      setPlayingId(null);
    }
  };

  const fetchLogs = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const response = await fetch(`${API_BASE_URL}/auth/logs/${deviceSerial}?limit=20`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data);
      }
    } catch (error) {
      console.error('Fetch logs error:', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchLogs(false);
    setRefreshing(false);
  }, [deviceSerial]);

  useEffect(() => {
    fetchLogs(true);

    // ✅ auto-refresh เบื้องหลัง — เรียก fetchLogs ตรงๆ โดยไม่ผ่าน onRefresh
    // เพื่อไม่ trigger setRefreshing(true) ซึ่งทำให้ RefreshControl โชว์ spinner
    // ขึ้นมาเองทุก 3 วินาที (ดูเหมือนมีคนปัดจอลงตลอดเวลา)
    const intervalId = setInterval(() => {
      console.log("🔄 หน้าจอกำลังออโต้รีเฟรชตัวเอง (เบื้องหลัง ไม่โชว์ spinner)...");
      fetchLogs(false);
    }, 3000);

    return () => clearInterval(intervalId);
  }, [deviceSerial]);

  useEffect(() => {
    if (logs.length > 0 && prevLogsRef.current.length > 0) {
      const latestNew = logs[0];
      const latestOld = prevLogsRef.current[0];

      if (latestNew.log_id !== latestOld.log_id) {
        console.log("🆕 เจอ Job ใหม่ทำสำเร็จ! ระบบกำลังเล่นเสียงออโต้...");
        playAudio(latestNew.job_uuid, latestNew.log_id);
      }
    }
    prevLogsRef.current = logs;
  }, [logs]);

  useEffect(() => {
    return () => {
      stopSound();
    };
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: pageBg }}>
      <StatusBar barStyle="light-content" backgroundColor={NAVBAR_COLOR} />

      {/* Header */}
      <View className="px-6 pt-14 pb-4" style={{ backgroundColor: NAVBAR_COLOR }}>
        <Text className={`${titleSize} font-bold text-white tracking-tight`}>Recent Events Logs</Text>
        <Text className={`${subtitleSize} text-white/60 mt-1 font-medium`}>Real-time AI analysis feed</Text>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="pb-6">
          {logs.map((log) => {
            const { tag, tagColor, tagBg } = getTagStyle(log.status, highContrast);
            const imageUrl = log.image_path ? `${API_BASE_URL}/image/${log.job_uuid}` : null;
            const isPlaying = playingId === log.log_id;

            return (
              <View
                key={log.log_id}
                className="flex-row mx-4 mt-3 rounded-xl overflow-hidden border"
                style={{ backgroundColor: cardBg, borderColor: cardBorder }}
              >
                {/* Thumbnail */}
                {imageUrl ? (
                  <Image source={{ uri: imageUrl }} style={{ width: 90, height: 100 }} resizeMode="cover" />
                ) : (
                  <View style={{ width: 90, height: 100, backgroundColor: imgPlaceholderBg }} className="items-center justify-center">
                    <Ionicons name="image-outline" size={26} color={textMuted} />
                  </View>
                )}

                {/* Content */}
                <View className="flex-1 p-3 justify-between">
                  <View className="flex-row items-center mb-1">
                    <Text className={`${captionSize} mr-2 font-medium`} style={{ color: textMuted }}>
                      {formatTime(log.created_at)}
                    </Text>
                    <View className="px-2 py-0.5 rounded-md" style={{ backgroundColor: tagBg }}>
                      <Text className="text-[10px] font-bold tracking-wider" style={{ color: tagColor }}>{tag}</Text>
                    </View>
                    <View className="flex-1" />
                    <View className="flex-row items-center opacity-60">
                      <Ionicons name="send-outline" size={11} color={textSecondary} />
                      <Text className="text-[11px] ml-1 font-medium" style={{ color: textSecondary }}>Sent</Text>
                    </View>
                  </View>

                  <Text className={`${bodySize} font-semibold leading-6 my-1`} style={{ color: textPrimary }}>
                    {log.result_text || 'ไม่มีข้อมูล'}
                  </Text>

                  <View className="flex-row items-center mt-2" style={{ gap: 12 }}>

                    {/* UI เครื่องเล่นเสียง */}
                    <View
                      className="flex-row items-center border rounded-xl pl-2 pr-3 py-1.5"
                      style={{
                        flex: 1, minWidth: 180, maxWidth: 320,
                        backgroundColor: isPlaying ? playerActiveBg : playerIdleBg,
                        borderColor: isPlaying ? playerActiveBorder : playerIdleBorder,
                      }}
                    >
                      <TouchableOpacity
                        onPress={() => isPlaying ? stopSound() : playAudio(log.job_uuid, log.log_id)}
                        className="w-7 h-7 rounded-full items-center justify-center"
                        style={{
                          backgroundColor: isPlaying ? '#2563EB' : cardBg,
                          borderWidth: isPlaying ? 0 : 1,
                          borderColor: cardBorder,
                        }}
                      >
                        <Ionicons
                          name={isPlaying ? "pause" : "play"}
                          size={13}
                          color={isPlaying ? "#FFFFFF" : textPrimary}
                          style={!isPlaying ? { marginLeft: 1 } : {}}
                        />
                      </TouchableOpacity>

                      <View className="flex-1 mx-2.5 justify-center">
                        <View className="w-full h-1 rounded-full overflow-hidden" style={{ backgroundColor: highContrast ? '#3F3F3F' : '#E5E7EB' }}>
                          <View className={`h-full rounded-full ${isPlaying ? 'bg-blue-500 w-full' : 'bg-transparent w-0'}`} />
                        </View>
                      </View>

                      <Text className="text-[10px] font-bold tracking-wider" style={{ color: isPlaying ? '#2563EB' : textMuted }}>
                        {isPlaying ? "PLAYING" : "AUDIO"}
                      </Text>
                    </View>

                    {/* ปุ่ม View Details */}
                    <TouchableOpacity className="flex-row items-center px-1 py-2">
                      <Ionicons name="eye-outline" size={13} color={textSecondary} />
                      <Text className={`${captionSize} ml-1 font-medium`} style={{ color: textSecondary }}>View Details</Text>
                    </TouchableOpacity>

                  </View>
                </View>
              </View>
            );
          })}

          {logs.length === 0 && !loading && (
            <View className="items-center justify-center py-16">
              <Ionicons name="document-text-outline" size={40} color={textMuted} />
              <Text className={`${bodySize} mt-2 font-medium`} style={{ color: textMuted }}>
                ไม่พบข้อมูลกิจกรรม
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}