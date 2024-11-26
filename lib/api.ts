import axios from 'axios';
import { supabase } from '@/lib/supabase';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Updated interceptor with better error handling
api.interceptors.request.use(async (config) => {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (session?.access_token) {
            config.headers.Authorization = `Bearer ${session.access_token}`;
        }
        
        return config;
    } catch (error) {
        console.error('Auth interceptor error:', error);
        return Promise.reject(error);
    }
}, (error) => {
    return Promise.reject(error);
});

// Add response interceptor for better error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('API Error:', {
            endpoint: error.config?.url,
            status: error.response?.status,
            message: error.response?.data?.error || error.message
        });
        return Promise.reject(error);
    }
);

export default api;