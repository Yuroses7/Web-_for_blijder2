import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, Image,
  Modal, RefreshControl, Text,
  TouchableOpacity, View, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { API_BASE_URL } from '../../constants/api';

interface JobLog {
  log_id: number;
  job_uuid: string;
  device_serial: string;
  status: 'completed' | 'failed';
  result_text: string;
  created_at: string;
}

const NUM_COLUMNS = 5;
const GAP = 4;

export default function GalleryScreen() {
  const { user } = useAuthStore();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const thumbSize = (screenW - GAP * (NUM_COLUMNS + 1)) / NUM_COLUMNS;
  const modalImgSize = Math.min(screenW * 0.9, screenH * 0.65);

  const [logs, setLogs] = useState<JobLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<JobLog | null>(null);

  const fetchLogs = useCallback(async () => {
    const serial = user?.device_serial;
    if (!serial) return;
    try {
      const res = await fetch(`${API_BASE_URL}/auth/logs/${serial}?limit=50`);
      if (res.ok) setLogs(await res.json());
    } catch (e) {
      console.error('fetchLogs:', e);
    }
  }, [user?.device_serial]);

  useEffect(() => {
    fetchLogs().finally(() => setLoading(false));
  }, [fetchLogs]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchLogs();
    setRefreshing(false);
  }, [fetchLogs]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('th-TH', {
      day: '2-digit', month: 'short',
      hour: '2-digit', minute: '2-digit',
    });

  if (loading) {
    return (
      <View className="flex-1 bg-[#0D3B2E] items-center justify-center">
        <ActivityIndicator color="#fff" size="large" />
        <Text className="text-white/60 mt-3 text-sm">กำลังโหลดรูปภาพ...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#0D3B2E]" edges={['bottom']}>
      {/* Device info bar */}
      <View className="px-4 py-2 bg-white/5 flex-row items-center justify-between">
        <Text className="text-white/60 text-xs">👤 {user?.full_name}</Text>
        <Text className="text-white/40 text-xs">📡 {user?.device_serial ?? 'ไม่พบอุปกรณ์'}</Text>
      </View>

      <FlatList
        data={logs}
        keyExtractor={item => item.job_uuid}
        numColumns={NUM_COLUMNS}
        key={NUM_COLUMNS}
        contentContainerStyle={{ padding: GAP }}
        columnWrapperStyle={{ gap: GAP, marginBottom: GAP }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-24">
            <Text className="text-5xl mb-4">📷</Text>
            <Text className="text-white/60 text-base text-center">ยังไม่มีรูปภาพ</Text>
            <Text className="text-white/40 text-xs text-center mt-1">
              รูปจากกล้องจะแสดงที่นี่เมื่อมีการตรวจจับ
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => setSelected(item)}
            style={{ width: thumbSize, height: thumbSize, borderRadius: 6, overflow: 'hidden', backgroundColor: '#ffffff10' }}
          >
            <Image
              source={{ uri: `${API_BASE_URL}/image/${item.job_uuid}` }}
              style={{ width: thumbSize, height: thumbSize }}
              resizeMode="cover"
            />
            {item.status === 'failed' && (
              <View style={{ position: 'absolute', top: 2, right: 2, backgroundColor: '#ef444480', borderRadius: 4, paddingHorizontal: 3 }}>
                <Text style={{ color: '#fca5a5', fontSize: 8 }}>✗</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      />

      {/* Lightbox modal — ไม่เกินขนาดจอ */}
      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setSelected(null)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', alignItems: 'center', justifyContent: 'center' }}
        >
          {selected && (
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <View style={{ backgroundColor: '#111', borderRadius: 12, overflow: 'hidden', maxWidth: screenW * 0.9 }}>
                <Image
                  source={{ uri: `${API_BASE_URL}/image/${selected.job_uuid}` }}
                  style={{ width: modalImgSize, height: modalImgSize }}
                  resizeMode="contain"
                />
                <View style={{ padding: 12 }}>
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600', textAlign: 'center', lineHeight: 20 }}>
                    {selected.result_text || 'ไม่มีข้อมูล'}
                  </Text>
                  <Text style={{ color: '#ffffff60', fontSize: 11, textAlign: 'center', marginTop: 4 }}>
                    {formatDate(selected.created_at)}
                  </Text>
                </View>
              </View>
              <Text style={{ color: '#ffffff60', textAlign: 'center', marginTop: 12, fontSize: 12 }}>
                แตะพื้นหลังเพื่อปิด
              </Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
