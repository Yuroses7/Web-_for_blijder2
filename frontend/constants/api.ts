import { Platform } from 'react-native';
 
export const API_BASE_URL = Platform.OS === 'web'
  ? 'http://localhost:8000'
  : 'http://192.168.1.6:8000';
 
export const ENDPOINTS = {
  detect:        `${API_BASE_URL}/detect`,
  detectPostman: `${API_BASE_URL}/detectpostman`,
  status:        (jobId: string) => `${API_BASE_URL}/status/${jobId}`,
  result:        (jobId: string) => `${API_BASE_URL}/result/${jobId}`,
  audio:         (jobId: string) => `${API_BASE_URL}/audio/${jobId}`,
  image:         (jobId: string) => `${API_BASE_URL}/image/${jobId}`,
  analysis:      (jobId: string) => `${API_BASE_URL}/analysis/${jobId}`,
  health:        `${API_BASE_URL}/health`,
  auth: {
    register:    `${API_BASE_URL}/auth/register`,
    login:       `${API_BASE_URL}/auth/login`,
    users:       `${API_BASE_URL}/auth/users`,
    devices:     (userId: number) => `${API_BASE_URL}/auth/devices/${userId}`,
    logs:        (serial: string) => `${API_BASE_URL}/auth/logs/${serial}`,
  },
};
 