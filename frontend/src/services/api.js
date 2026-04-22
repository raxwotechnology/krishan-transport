import axios from 'axios';

const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_URL = import.meta.env.VITE_API_URL || (isLocal ? 'http://localhost:5000/api' : 'https://krishan-transport-1.onrender.com/api');

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor to add auth token to headers
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('kt_auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Fallback logic for LocalStorage
const getFallback = (key) => JSON.parse(localStorage.getItem(key) || '[]');
const setFallback = (key, data) => localStorage.setItem(key, JSON.stringify(data));

const wrapAPI = (endpoint, storageKey) => ({
  get: async () => {
    try {
      const res = await api.get(endpoint);
      setFallback(storageKey, res.data);
      return res;
    } catch (err) {
      if (!err.response) {
        console.warn(`Backend offline for ${endpoint}, using localStorage fallback.`);
        return { data: getFallback(storageKey) };
      }
      throw err;
    }
  },
  create: async (data) => {
    try {
      const res = await api.post(endpoint, data);
      const current = getFallback(storageKey);
      setFallback(storageKey, [...current, res.data]);
      return res;
    } catch (err) {
      if (!err.response) {
        console.warn(`Backend offline for ${endpoint}, saving to localStorage only.`);
        const newData = { ...data, _id: Date.now().toString(), createdAt: new Date().toISOString() };
        const current = getFallback(storageKey);
        setFallback(storageKey, [...current, newData]);
        return { data: newData };
      }
      throw err;
    }
  },
  update: async (id, data) => {
    try {
      const res = await api.put(`${endpoint}/${id}`, data);
      const current = getFallback(storageKey);
      setFallback(storageKey, current.map(item => item._id === id ? res.data : item));
      return res;
    } catch (err) {
      if (!err.response) {
        console.warn(`Backend offline for update ${endpoint}, updating localStorage.`);
        const current = getFallback(storageKey);
        const updated = current.map(item => item._id === id ? { ...item, ...data } : item);
        setFallback(storageKey, updated);
        return { data: { ...data, _id: id } };
      }
      throw err;
    }
  },
  delete: async (id) => {
    try {
      const res = await api.delete(`${endpoint}/${id}`);
      const current = getFallback(storageKey);
      const filtered = current.filter(item => {
        const itemId = item._id ? item._id.toString() : '';
        const targetId = id ? id.toString() : '';
        return itemId !== targetId;
      });
      setFallback(storageKey, filtered);
      return res;
    } catch (err) {
      if (!err.response) {
        console.warn(`[API] Backend offline for delete ${endpoint}, removing from localStorage.`);
        const current = getFallback(storageKey);
        const filtered = current.filter(item => {
          const itemId = item._id ? item._id.toString() : '';
          const targetId = id ? id.toString() : '';
          return itemId !== targetId;
        });
        setFallback(storageKey, filtered);
        return { data: { success: true } };
      }
      throw err;
    }
  }
});

export const dieselAPI     = wrapAPI('/diesel',     'kt_diesel');
export const hireAPI       = wrapAPI('/hires',      'kt_hires');
export const salaryAPI     = wrapAPI('/salaries',   'kt_salaries');
export const paymentAPI    = wrapAPI('/payments',   'kt_payments');
export const clientAPI     = wrapAPI('/clients',    'kt_clients');
export const vehicleAPI    = wrapAPI('/vehicles',   'kt_vehicles');
export const employeeAPI   = wrapAPI('/employees',  'kt_employees');
export const invoiceAPI    = wrapAPI('/invoices',   'kt_invoices');
export const quotationAPI  = wrapAPI('/quotations', 'kt_quotations');

export default api;

