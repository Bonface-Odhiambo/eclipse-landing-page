// eclipse/app/context/SocketContext.tsx

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';


// Event interfaces
interface ServerToClientEvents {
  connect: () => void;
  disconnect: () => void;
  connect_error: (error: Error) => void;
  receive_message: (data: ChatMessageData) => void;
  user_joined: (data: UserJoinedData) => void;
  user_left: (data: UserLeftData) => void;
  user_typing: (data: UserTypingData) => void;
  messages_read: (data: MessagesReadData) => void;
  user_offline: (data: UserOfflineData) => void;
  error: (error: string) => void;
}

interface ClientToServerEvents {
  join_chat: (data: JoinChatData) => void;
  leave_chat: (chatId: string) => void;
  send_message: (data: SendMessageData) => void;
  typing: (data: TypingData) => void;
  mark_read: (data: MarkReadData) => void;
}

// Data type interfaces
interface ChatMessageData {
  id: string;
  content: string;
  sender: string;
  timestamp: Date;
  chatId: string;
  messageType?: 'text' | 'file' | 'image';
}

interface UserJoinedData {
  userId: string;
  role: string;
  timestamp: Date;
}

interface UserLeftData {
  userId: string;
  timestamp: Date;
}

interface UserTypingData {
  userId: string;
  isTyping: boolean;
}

interface MessagesReadData {
  userId: string;
  messageIds: string[];
  timestamp: Date;
}

interface UserOfflineData {
  userId: string;
  timestamp: Date;
}

interface JoinChatData {
  chatId: string;
  role: string;
}

interface SendMessageData {
  chatId: string;
  content: string;
  recipientId: string;
  messageType?: 'text' | 'file' | 'image';
}

interface TypingData {
  chatId: string;
  isTyping: boolean;
}

interface MarkReadData {
  chatId: string;
  messageIds: string[];
}

type SocketType = Socket<ServerToClientEvents, ClientToServerEvents>;

interface SocketContextType {
  socket: SocketType | null;
  connected: boolean;
  userId: string | undefined;
}

const SocketContext = createContext<SocketContextType | null>(null);

interface SocketProviderProps {
  children: React.ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const [socket, setSocket] = useState<SocketType | null>(null);
  const [connected, setConnected] = useState(false);
  const supabase = createClientComponentClient();
  const [userId, setUserId] = useState<string | undefined>(undefined);

  useEffect(() => {
    let socketInstance: SocketType | null = null;

    const initializeSocket = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
          console.error('Auth error:', error);
          return;
        }

        const token = session.access_token;
        setUserId(session.user.id);

        socketInstance = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000', {
          auth: { token },
          transports: ['websocket'],
          autoConnect: true,
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          withCredentials: true
        });

        socketInstance.on('connect', () => {
          console.log('Connected to socket server');
          setConnected(true);
        });

        socketInstance.on('disconnect', () => {
          console.log('Disconnected from socket server');
          setConnected(false);
        });

        socketInstance.on('connect_error', (error: Error) => {
          console.error('Socket connection error:', error);
          setConnected(false);
        });

        setSocket(socketInstance);
      } catch (error) {
        console.error('Error initializing socket:', error);
      }
    };

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        initializeSocket();
      } else if (event === 'SIGNED_OUT') {
        if (socketInstance) {
          socketInstance.disconnect();
          setSocket(null);
          setConnected(false);
          setUserId(undefined);
        }
      }
    });

    // Initial check for session
    initializeSocket();

    // Cleanup function
    return () => {
      subscription.unsubscribe();
      if (socketInstance) {
        socketInstance.disconnect();
        setSocket(null);
        setConnected(false);
      }
    };
  }, [supabase]);

  const value = {
    socket,
    connected,
    userId
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

// Custom hook
export function useSocket(): SocketContextType {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}