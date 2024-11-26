import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { supabase } from '@/lib/supabase'; // Updated import path

export const useSocket = () => {
  const socketRef = useRef<Socket>();

  useEffect(() => {
    const initSocket = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.access_token) {
        socketRef.current = io(process.env.NEXT_PUBLIC_API_URL!, {
          auth: {
            token: session.access_token
          },
          withCredentials: true
        });

        socketRef.current.on('connect', () => {
          console.log('Connected to socket server');
        });

        socketRef.current.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
        });
      }
    };

    initSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  return socketRef.current;
};