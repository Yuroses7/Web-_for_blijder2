import { create } from 'zustand';

interface AccessibilityState {
  highContrast: boolean;
  largeText: boolean;
  setHighContrast: (value: boolean) => void;
  setLargeText: (value: boolean) => void;
}

/**
 * Global accessibility settings — ใช้ zustand เหมือน authStore
 * เพื่อให้ทุกหน้าจอในแอปอ่านค่า highContrast/largeText ได้ตรงกันแบบ real-time
 * โดยไม่ต้องส่ง props ผ่านหลายชั้น
 *
 * หมายเหตุ: ค่านี้จะรีเซ็ตเมื่อปิดแอป (อยู่ใน memory เท่านั้น)
 * ถ้าต้องการให้จำค่าข้ามเซสชัน ต้องเพิ่ม persist middleware ร่วมกับ AsyncStorage
 */
export const useAccessibilityStore = create<AccessibilityState>((set) => ({
  highContrast: false,
  largeText: false,
  setHighContrast: (value) => set({ highContrast: value }),
  setLargeText: (value) => set({ largeText: value }),
}));

/**
 * Helper สำหรับคำนวณขนาดตัวอักษรตาม largeText setting
 * ใช้แทนการ hardcode className ขนาดตัวอักษรในแต่ละหน้า
 *
 * วิธีใช้: const fontSize = useScaledFontSize('text-sm'); // คืนค่า 'text-base' ถ้า largeText = true
 */
const FONT_SCALE_MAP: Record<string, string> = {
  'text-xs': 'text-sm',
  'text-sm': 'text-base',
  'text-base': 'text-lg',
  'text-lg': 'text-xl',
  'text-xl': 'text-2xl',
  'text-2xl': 'text-3xl',
};

export function useScaledFontSize(baseClassName: string): string {
  const largeText = useAccessibilityStore((s) => s.largeText);
  if (!largeText) return baseClassName;
  return FONT_SCALE_MAP[baseClassName] || baseClassName;
}

/**
 * Helper สำหรับสลับสีตาม highContrast setting
 * ส่ง object ที่มี key เป็นชื่อสีปกติ/highContrast แล้วจะคืนค่าที่ถูกต้องให้อัตโนมัติ
 *
 * วิธีใช้:
 *   const colors = useContrastColors({
 *     bg: { normal: '#F8FAFC', highContrast: '#000000' },
 *     text: { normal: '#0D3B2E', highContrast: '#FFFFFF' },
 *   });
 *   colors.bg, colors.text
 */
type ContrastPair = { normal: string; highContrast: string };

export function useContrastColors<T extends Record<string, ContrastPair>>(
  pairs: T
): Record<keyof T, string> {
  const highContrast = useAccessibilityStore((s) => s.highContrast);
  const result: Record<string, string> = {};
  for (const key in pairs) {
    result[key] = highContrast ? pairs[key].highContrast : pairs[key].normal;
  }
  return result as Record<keyof T, string>;
}