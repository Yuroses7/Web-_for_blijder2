import "../global.css";
import { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { useAuthStore } from "../store/authStore";

export default function RootLayout() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();
  const [ready, setReady] = useState(false);

  // ✅ รอให้ Stack mount เสร็จก่อน
  useEffect(() => {
    setReady(true);
  }, []);

  // ✅ พอ ready แล้วค่อย watch — ทำงานทั้ง native + web
  useEffect(() => {
    if (!ready) return;
    const inTabs = segments[0] === "(tabs)";
    if (!isAuthenticated && inTabs) {
      router.replace("/");
    }
  }, [isAuthenticated, segments, ready]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="register" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}