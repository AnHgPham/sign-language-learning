import axios from 'axios';

// API base URL - uses /api prefix which Nginx proxies to FastAPI
const API_BASE_URL = '/api';

// Create axios instance with default config
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests if available
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authApi = {
  register: async (email: string, password: string, username: string) => {
    const response = await apiClient.post('/auth/register', { email, password, username });
    return response.data;
  },
  login: async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
  },
};

// Detection API
export const detectionApi = {
  detect: async (imageBase64: string, confThreshold: number = 0.5) => {
    const response = await apiClient.post('/detection/detect', {
      image: imageBase64,
      conf_threshold: confThreshold,
    });
    return response.data;
  },
  getClasses: async () => {
    const response = await apiClient.get('/detection/classes');
    return response.data;
  },
};

// Vocabulary API
export const vocabularyApi = {
  getAll: async () => {
    const response = await apiClient.get('/vocabulary/');
    return response.data;
  },
  getById: async (id: number) => {
    const response = await apiClient.get(`/vocabulary/${id}`);
    return response.data;
  },
  getRandom: async (count: number = 1) => {
    const response = await apiClient.get(`/vocabulary/random/${count}`);
    return response.data;
  },
};

// Progress API
export const progressApi = {
  getUserProgress: async () => {
    const response = await apiClient.get('/progress/');
    return response.data;
  },
  startSession: async () => {
    const response = await apiClient.post('/progress/session/start');
    return response.data;
  },
  endSession: async (sessionId: number, correctCount: number, totalCount: number) => {
    const response = await apiClient.post(`/progress/session/${sessionId}/end`, {
      correct_count: correctCount,
      total_count: totalCount,
    });
    return response.data;
  },
  updateProgress: async (vocabId: number, isCorrect: boolean) => {
    const response = await apiClient.post('/progress/update', {
      vocab_id: vocabId,
      is_correct: isCorrect,
    });
    return response.data;
  },
};
