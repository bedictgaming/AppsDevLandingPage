import axios from 'axios';

const API_URL = 'http://localhost:5000';

export const authAPI = {
  signup: (name: string, studentId: string, password: string) =>
    axios.post(`${API_URL}/auth/signup`, { name, studentId, password }),

  login: (studentId: string, password: string) =>
    axios.post(`${API_URL}/auth/login`, { studentId, password }),

  getProfile: (token: string) =>
    axios.get(`${API_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    })
};

export const lostItemAPI = {
  create: (data: any, token: string) =>
    axios.post(`${API_URL}/lost-items`, data, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  getAll: () =>
    axios.get(`${API_URL}/lost-items`)
};

export const foundItemAPI = {
  create: (data: any, token: string) =>
    axios.post(`${API_URL}/found-items`, data, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  getAll: () =>
    axios.get(`${API_URL}/found-items`)
};

export const chatAPI = {
  startConversation: (foundItemId: string, subject: string, token: string) =>
    axios.post(`${API_URL}/chat/conversation`, { foundItemId, subject }, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  sendMessage: (conversationId: string, content: string, token: string) =>
    axios.post(`${API_URL}/chat/message`, { conversationId, content }, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  getMessages: (conversationId: string) =>
    axios.get(`${API_URL}/chat/messages/${conversationId}`),

  getUserConversations: (token: string) =>
    axios.get(`${API_URL}/chat/user-conversations`, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  getAdminConversations: (token: string) =>
    axios.get(`${API_URL}/chat/admin/conversations`, {
      headers: { Authorization: `Bearer ${token}` }
    })
};