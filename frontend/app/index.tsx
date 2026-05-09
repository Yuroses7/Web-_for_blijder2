import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, KeyboardAvoidingView,
    Platform, StatusBar,
    Text, TextInput, TouchableOpacity,
    View,
} from 'react-native';
import { useAuthStore } from '../store/authStore';

export default function LoginScreen() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { login, isLoading, isAuthenticated } = useAuthStore();

    useEffect(() => {
        if (isAuthenticated) {
            router.replace('/(tabs)/dashboard' as any);
        }
    }, [isAuthenticated]);

    const handleLogin = async () => {
        if (!username.trim() || !password.trim()) {
            Alert.alert('แจ้งเตือน', 'กรุณากรอก Username และ Password');
            return;
        }
        const success = await login(username.trim(), password.trim());
        if (!success) {
            Alert.alert('เข้าสู่ระบบไม่สำเร็จ', 'Username หรือ Password ไม่ถูกต้อง');
        }
    };

    return (
        <KeyboardAvoidingView
            className="flex-1 bg-[#0D3B2E]"
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <StatusBar barStyle="light-content" backgroundColor="#0D3B2E" />

            <View className="flex-1 items-center justify-center px-6">

                {/* Logo */}
                <View className="items-center mb-8">
                    <View className="w-20 h-20 rounded-full bg-white/10 border border-white/20 items-center justify-center mb-4">
                        <View className="w-9 h-9 rounded-full border-2 border-white/80 items-center justify-center">
                            <View className="w-3 h-3 rounded-full bg-white/80" />
                        </View>
                    </View>
                    <Text className="text-3xl font-bold text-white tracking-wide">Seeing Eyes</Text>
                    <Text className="text-sm text-white/50 mt-1">Caregiver Monitoring Portal</Text>
                </View>

                {/* Card */}
                <View className="w-full bg-white rounded-2xl p-7 shadow-lg">
                    <Text className="text-xl font-bold text-gray-900 mb-6">เข้าสู่ระบบ</Text>

                    {/* Username */}
                    <View className="mb-4">
                        <Text className="text-sm font-medium text-gray-600 mb-1.5">Username</Text>
                        <TextInput
                            className="border border-gray-200 rounded-xl px-4 bg-gray-50 h-12 text-gray-900 text-base"
                            placeholder="กรอก Username"
                            placeholderTextColor="#9CA3AF"
                            value={username}
                            onChangeText={setUsername}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </View>

                    {/* Password */}
                    <View className="mb-4">
                        <Text className="text-sm font-medium text-gray-600 mb-1.5">Password</Text>
                        <View className="flex-row items-center border border-gray-200 rounded-xl px-4 bg-gray-50 h-12">
                            <TextInput
                                className="flex-1 text-gray-900 text-base"
                                placeholder="กรอก Password"
                                placeholderTextColor="#9CA3AF"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                onSubmitEditing={handleLogin}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                <Text className="text-xs text-gray-400 font-medium">
                                    {showPassword ? 'ซ่อน' : 'แสดง'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Forgot / Register */}
                    <View className="flex-row justify-end mb-5">
                        <Text className="text-sm text-gray-400">Forgot Password?  </Text>
                        <TouchableOpacity onPress={() => router.push('/register' as any)}>
                            <Text className="text-sm text-[#0D6E4F] font-semibold">Register</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Login Button */}
                    <TouchableOpacity
                        className={`bg-[#0D6E4F] rounded-xl h-13 items-center justify-center ${isLoading ? 'opacity-70' : ''}`}
                        onPress={handleLogin}
                        disabled={isLoading}
                        activeOpacity={0.85}
                    >
                        {isLoading
                            ? <ActivityIndicator color="#fff" />
                            : <Text className="text-white text-base font-semibold">Login</Text>
                        }
                    </TouchableOpacity>

                    <Text className="text-center text-xs text-gray-300 mt-4">Demo: demo / demo1234</Text>
                </View>

                <Text className="mt-6 text-xs text-white/30">© 2025 Seeing Eyes Inc.</Text>
            </View>
        </KeyboardAvoidingView>
    );
}
