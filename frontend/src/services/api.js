import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 3000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Fallback logic for LocalStorage
const getFallback = (key) => JSON.parse(localStorage.getItem(key) || '[]');
const setFallback = (key, data) => localStorage.setItem(key, JSON.stringify(data));

const wrapAPI = (endpoint, storageKey) => ({
  get: async () => {
    try {
      const res = await api.get(endpoint);
      setFallback(storageKey, res.data); // Update cache
      return res;
    } catch (err) {
      console.warn(`Backend offline for ${endpoint}, using localStorage fallback.`);
      return { data: getFallback(storageKey) };
    }
  },
  create: async (data) => {
    try {
      const res = await api.post(endpoint, data);
      // Sync local after success
      const current = getFallback(storageKey);
      setFallback(storageKey, [...current, res.data]);
      return res;
    } catch (err) {
      console.warn(`Backend offline for ${endpoint}, saving to localStorage only.`);
      const current = getFallback(storageKey);
      const newData = { ...data, _id: Date.now().toString(), createdAt: new Date().toISOString() };
      const updated = [...current, newData];
      setFallback(storageKey, updated);
      return { data: newData };
    }
  },
  update: async (id, data) => {
    try {
      const res = await api.put(`${endpoint}/${id}`, data);
      const current = getFallback(storageKey);
      setFallback(storageKey, current.map(item => item._id === id ? res.data : item));
      return res;
    } catch (err) {
      console.warn(`Backend offline for update ${endpoint}, updating localStorage.`);
      const current = getFallback(storageKey);
      const updated = current.map(item => item._id === id ? { ...item, ...data } : item);
      setFallback(storageKey, updated);
      return { data: { ...data, _id: id } };
    }
  },
  delete: async (id) => {
    console.log(`[API] Deleting from ${endpoint} with ID:`, id);
    try {
      const res = await api.delete(`${endpoint}/${id}`);
      const current = getFallback(storageKey);
      const filtered = current.filter(item => {
        const itemId = item._id ? item._id.toString() : '';
        const targetId = id ? id.toString() : '';
        return itemId !== targetId;
      });
      setFallback(storageKey, filtered);
      console.log(`[API] Success deleting ${endpoint} from backend and local cache`);
      return res;
    } catch (err) {
      console.warn(`[API] Backend offline or error for delete ${endpoint}, removing from localStorage. Error:`, err.message);
      const current = getFallback(storageKey);
      const filtered = current.filter(item => {
        const itemId = item._id ? item._id.toString() : '';
        const targetId = id ? id.toString() : '';
        return itemId !== targetId;
      });
      setFallback(storageKey, filtered);
      return { data: { success: true } };
    }
  }
});

export const dieselAPI = wrapAPI('/diesel', 'kt_diesel');
export const hireAPI = wrapAPI('/hires', 'kt_hires');
export const salaryAPI = wrapAPI('/salaries', 'kt_salaries');
export const paymentAPI = wrapAPI('/payments', 'kt_payments');
export const clientAPI = wrapAPI('/clients', 'kt_clients');
export const vehicleAPI = wrapAPI('/vehicles', 'kt_vehicles');
export const employeeAPI = wrapAPI('/employees', 'kt_employees');

export default api;
