import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, ScrollView, StatusBar,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { API_BASE_URL } from '../constants/api';

interface RegisterForm {
  username:           string;
  password:           string;
  confirmPassword:    string;
  full_name:          string;
  disability_details: string;
  device_serial:      string;
  device_name:        string;
}

export default function RegisterScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [phoneDigits, setPhoneDigits] = useState('');
  const [form, setForm] = useState<RegisterForm>({
    username:           '',
    password:           '',
    confirmPassword:    '',
    full_name:          '',
    disability_details: '',
    device_serial:      '',
    device_name:        'Seeing Eyes Glass',
  });

  const update = (key: keyof RegisterForm) => (val: string) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const handlePhoneChange = (text: string) => {
    const digits = text.replace(/\D/g, '');
    const cleaned = digits.startsWith('0') ? digits.slice(1) : digits;
    setPhoneDigits(cleaned.slice(0, 9));
  };

  const emergencyContact = '+66' + phoneDigits;

  const validate = (): string | null => {
    if (!form.username.trim())    return 'กรุณากรอก Username';
    if (form.username.length < 4) return 'Username ต้องมีอย่างน้อย 4 ตัวอักษร';
    if (!form.password)           return 'กรุณากรอก Password';
    if (form.password.length < 6) return 'Password ต้องมีอย่างน้อย 6 ตัวอักษร';
    if (form.password !== form.confirmPassword) return 'Password ไม่ตรงกัน';
    if (!form.full_name.trim())   return 'กรุณากรอกชื่อ-นามสกุล';
    if (phoneDigits.length < 8)   return 'กรุณากรอกเบอร์ติดต่อฉุกเฉิน (8–9 หลัก)';
    return null;
  };

  const handleRegister = async () => {
    const error = validate();
    if (error) {
      if (Platform.OS === 'web') { window.alert(error); return; }
      Alert.alert('ข้อมูลไม่ครบ', error);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username:           form.username.trim(),
          password:           form.password,
          full_name:          form.full_name.trim(),
          emergency_contact:  emergencyContact,
          disability_details: form.disability_details.trim() || null,
          device_serial:      form.device_serial.trim() || null,
          device_name:        form.device_name.trim() || 'Seeing Eyes Glass',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const msg = data.detail || 'สมัครสมาชิกไม่สำเร็จ';
        if (Platform.OS === 'web') { window.alert(msg); return; }
        Alert.alert('เกิดข้อผิดพลาด', msg);
        return;
      }

      if (Platform.OS === 'web') {
        window.alert('สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบ');
        router.replace('/');
      } else {
        Alert.alert('สมัครสมาชิกสำเร็จ', 'กรุณาเข้าสู่ระบบ', [
          { text: 'ตกลง', onPress: () => router.replace('/') },
        ]);
      }
    } catch (err: any) {
      const msg = err.message || 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้';
      if (Platform.OS === 'web') { window.alert(msg); return; }
      Alert.alert('เกิดข้อผิดพลาด', msg);
    } finally {
      setIsLoading(false);
    }
  };

  const passwordMatch = form.confirmPassword.length > 0
    && form.password === form.confirmPassword;
  const passwordMismatch = form.confirmPassword.length > 0
    && form.password !== form.confirmPassword;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#0D3B2E]"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0D3B2E" />

      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 items-center justify-center px-6 py-10">

          {/* Header */}
          <View className="items-center mb-6">
            <View className="w-16 h-16 rounded-full bg-white/10 border border-white/20 items-center justify-center mb-4">
              <View className="w-7 h-7 rounded-full border-2 border-white/80 items-center justify-center">
                <View className="w-2.5 h-2.5 rounded-full bg-white/80" />
              </View>
            </View>
            <Text className="text-2xl font-bold text-white">สมัครสมาชิก</Text>
            <Text className="text-sm text-white/50 mt-1">Caregiver Account</Text>
          </View>

          {/* Form Card */}
          <View className="w-full bg-white rounded-2xl p-6 shadow-lg">

            <Field label="Username *">
              <TextInput
                className="border border-gray-200 rounded-xl px-4 bg-gray-50 h-12 text-gray-900 text-base"
                placeholder="ตัวอักษร + ตัวเลข อย่างน้อย 4 ตัว"
                placeholderTextColor="#9CA3AF"
                value={form.username}
                onChangeText={update('username')}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </Field>

            <Field label="ชื่อ-นามสกุล *">
              <TextInput
                className="border border-gray-200 rounded-xl px-4 bg-gray-50 h-12 text-gray-900 text-base"
                placeholder="เช่น Somsri Konthai"
                placeholderTextColor="#9CA3AF"
                value={form.full_name}
                onChangeText={update('full_name')}
              />
            </Field>

            <Field label="Password *">
              <View className="flex-row items-center border border-gray-200 rounded-xl px-4 bg-gray-50 h-12">
                <TextInput
                  className="flex-1 text-gray-900 text-base"
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  placeholderTextColor="#9CA3AF"
                  value={form.password}
                  onChangeText={update('password')}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Text className="text-xs text-gray-400 font-medium">
                    {showPassword ? 'ซ่อน' : 'แสดง'}
                  </Text>
                </TouchableOpacity>
              </View>
            </Field>

            <Field label="ยืนยัน Password *">
              <View className="flex-row items-center border border-gray-200 rounded-xl px-4 bg-gray-50 h-12">
                <TextInput
                  className="flex-1 text-gray-900 text-base"
                  placeholder="กรอก Password อีกครั้ง"
                  placeholderTextColor="#9CA3AF"
                  value={form.confirmPassword}
                  onChangeText={update('confirmPassword')}
                  secureTextEntry={!showPassword}
                />
                {passwordMatch && (
                  <Text className="text-xs text-green-500 font-medium">ตรงกัน</Text>
                )}
                {passwordMismatch && (
                  <Text className="text-xs text-red-400 font-medium">ไม่ตรงกัน</Text>
                )}
              </View>
            </Field>

            <Field label="เบอร์ติดต่อฉุกเฉิน *">
              <View className="flex-row items-center border border-gray-200 rounded-xl bg-gray-50 h-12 overflow-hidden">
                <View className="px-3 h-full items-center justify-center border-r border-gray-200 bg-gray-100">
                  <Text className="text-gray-600 font-medium text-base">+66</Text>
                </View>
                <TextInput
                  className="flex-1 text-gray-900 text-base px-3"
                  placeholder="812345678"
                  placeholderTextColor="#9CA3AF"
                  value={phoneDigits}
                  onChangeText={handlePhoneChange}
                  keyboardType="phone-pad"
                  maxLength={9}
                />
              </View>
            </Field>

            <Field label="Device Serial (จากแว่นตา ESP32)">
              <TextInput
                className="border border-gray-200 rounded-xl px-4 bg-gray-50 h-12 text-gray-900 text-base"
                placeholder="เช่น SE-001, SN-EYES-001"
                placeholderTextColor="#9CA3AF"
                value={form.device_serial}
                onChangeText={update('device_serial')}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </Field>

            <Field label="รายละเอียดความพิการ (ถ้ามี)">
              <View className="border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 min-h-[72px]">
                <TextInput
                  className="text-gray-900 text-base"
                  placeholder="เช่น Macular Degeneration, ตาบอดสนิท"
                  placeholderTextColor="#9CA3AF"
                  value={form.disability_details}
                  onChangeText={update('disability_details')}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </Field>

            <TouchableOpacity
              className={`bg-[#0D6E4F] rounded-xl h-14 items-center justify-center mt-2 ${isLoading ? 'opacity-70' : ''}`}
              onPress={handleRegister}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading
                ? <ActivityIndicator color="#fff" />
                : <Text className="text-white text-base font-semibold">สมัครสมาชิก</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity
              className="items-center mt-4"
              onPress={() => router.replace('/')}
            >
              <Text className="text-sm text-gray-400">
                มีบัญชีแล้ว?{' '}
                <Text className="text-[#0D6E4F] font-semibold">เข้าสู่ระบบ</Text>
              </Text>
            </TouchableOpacity>

          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-gray-600 mb-1.5">{label}</Text>
      {children}
    </View>
  );
}
