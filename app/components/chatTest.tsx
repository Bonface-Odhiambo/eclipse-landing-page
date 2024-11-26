// eclipse/app/components/ChatTest.tsx

import { useEffect, useState } from 'react';
import { useSocket } from '../context/socketContext';
interface ChatMessage {
  id: string;
  content: string;
  sender: string;
  timestamp: Date;
  chatId: string;
  messageType?: 'text' | 'file' | 'image';
}

export default function ChatTest() {
  const { socket, connected, userId } = useSocket();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const chatId = 'test-room';

  useEffect(() => {
    if (!socket) {
      return; // Early return if no socket
    }
    
    // Join chat with proper data structure
    socket.emit('join_chat', {
      chatId,
      role: 'user'
    });
  
    // Listen for messages with proper typing
    socket.on('receive_message', (data: ChatMessage) => {
      setMessages((prev) => [...prev, data]);
    });
  
    // Cleanup function
    return () => {
      socket.off('receive_message');
      socket.emit('leave_chat', chatId);
    };
  }, [socket, chatId]);
  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && socket && userId) {
      // Prepare message data according to SendMessageData interface
      const messageData = {
        chatId,
        content: message.trim(),
        recipientId: chatId, // In a group chat, this could be the room ID
        messageType: 'text' as const
      };

      // Send message with correct event and data structure
      socket.emit('send_message', messageData);
      
      // Add message to local state
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        content: message.trim(),
        sender: userId,
        timestamp: new Date(),
        chatId,
        messageType: 'text'
      };
      
      setMessages(prev => [...prev, newMessage]);
      setMessage('');
    }
  };

  return (
    <div className="p-4">
      <div className="mb-4">
        <p>Connection Status: {connected ? 'Connected' : 'Disconnected'}</p>
      </div>

      <div className="mb-4 h-60 overflow-y-auto border p-4">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`mb-2 ${msg.sender === userId ? 'text-right' : ''}`}
          >
            <span className="font-bold">{msg.sender === userId ? 'You' : 'Other'}: </span>
            <span>{msg.content}</span>
            <div className="text-xs text-gray-500">
              {new Date(msg.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={sendMessage} className="flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="flex-1 border p-2 rounded"
          placeholder="Type a message..."
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-300"
          disabled={!connected}
        >
          Send
        </button>
      </form>
    </div>
  );
}