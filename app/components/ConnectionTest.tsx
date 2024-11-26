import React, { useState, useEffect } from 'react';
import { Socket, io } from 'socket.io-client';
import api from '@/lib/api';
import { supabase } from '@/lib/supabase';

// Type definitions
interface TestStatus {
  status: 'pending' | 'success' | 'failed';
  message: string;
}

interface TestStates {
  auth: TestStatus;
  api: TestStatus;
  socket: TestStatus;
  routes: TestStatus;
}

type UserRole = 'writer' | 'employer' | 'editor' | 'admin' | '';

interface EndpointMap {
  [key: string]: string;
  writer: string;
  employer: string;
  editor: string;
  admin: string;
}

const ConnectionTest: React.FC = () => {
    const [tests, setTests] = useState<TestStates>({
        auth: { status: 'pending', message: '' },
        api: { status: 'pending', message: '' },
        socket: { status: 'pending', message: '' },
        routes: { status: 'pending', message: '' }
    });
    const [socket, setSocket] = useState<Socket | null>(null);
    const [userRole, setUserRole] = useState<UserRole>('');

    // Define endpoints mapping
    const endpoints: EndpointMap = {
        writer: '/api/writer',
        employer: '/api/employer',
        editor: '/api/editor',
        admin: '/api/admin'
    };

    // Test authentication
    const testAuth = async (): Promise<string | false> => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setTests(prev => ({
                    ...prev,
                    auth: { status: 'failed', message: 'No active session found' }
                }));
                return false;
            }
            setTests(prev => ({
                ...prev,
                auth: { status: 'success', message: 'Authentication successful' }
            }));
            return session.access_token;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            setTests(prev => ({
                ...prev,
                auth: { status: 'failed', message: `Auth error: ${errorMessage}` }
            }));
            return false;
        }
    };

    // Test API connection
    const testAPI = async (): Promise<void> => {
        try {
            const response = await api.get('/');
            setTests(prev => ({
                ...prev,
                api: { 
                    status: 'success', 
                    message: `API connected: ${response.data.message}` 
                }
            }));
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            setTests(prev => ({
                ...prev,
                api: { 
                    status: 'failed', 
                    message: `API error: ${errorMessage}` 
                }
            }));
        }
    };

    // Test Socket connection
    const testSocket = async (token: string): Promise<void> => {
        try {
            const socketInstance = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000', {
                auth: { token },
                withCredentials: true
            });

            socketInstance.on('connect', () => {
                setTests(prev => ({
                    ...prev,
                    socket: { 
                        status: 'success', 
                        message: 'Socket connected successfully' 
                    }
                }));
                setSocket(socketInstance);
            });

            socketInstance.on('connect_error', (error: Error) => {
                setTests(prev => ({
                    ...prev,
                    socket: { 
                        status: 'failed', 
                        message: `Socket connection error: ${error.message}` 
                    }
                }));
            });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            setTests(prev => ({
                ...prev,
                socket: { 
                    status: 'failed', 
                    message: `Socket setup error: ${errorMessage}` 
                }
            }));
        }
    };

    // Test role-specific routes
    const testRoutes = async (): Promise<void> => {
        if (!userRole) return;

        try {
            const endpoint = endpoints[userRole];
            await api.get(endpoint);
            setTests(prev => ({
                ...prev,
                routes: { 
                    status: 'success', 
                    message: `Route access successful for role: ${userRole}` 
                }
            }));
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            setTests(prev => ({
                ...prev,
                routes: { 
                    status: 'failed', 
                    message: `Route access error: ${errorMessage}` 
                }
            }));
        }
    };

    // Run all tests
    useEffect(() => {
        const runTests = async () => {
            const token = await testAuth();
            if (token) {
                await testAPI();
                await testSocket(token);
                if (userRole) {
                    await testRoutes();
                }
            }
        };

        runTests();

        return () => {
            if (socket) {
                socket.disconnect();
            }
        };
    }, [userRole]);

    // Test socket message
    const testSocketMessage = () => {
        if (!socket) return;
        
        const testChatId = 'test-chat';
        socket.emit('join_chat', { chatId: testChatId, role: userRole });
        
        setTimeout(() => {
            socket.emit('send_message', {
                chatId: testChatId,
                content: 'Test message',
                recipientId: 'test-recipient',
                messageType: 'text'
            });
        }, 1000);
    };

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Connection Test Dashboard</h1>
            
            <div className="space-y-4">
                {Object.entries(tests).map(([key, value]) => (
                    <div key={key} className="border rounded p-4">
                        <h2 className="font-semibold capitalize">{key} Test</h2>
                        <div className={`mt-2 ${
                            value.status === 'success' ? 'text-green-600' :
                            value.status === 'failed' ? 'text-red-600' :
                            'text-yellow-600'
                        }`}>
                            Status: {value.status}
                        </div>
                        <div className="mt-1 text-sm">{value.message}</div>
                    </div>
                ))}
            </div>

            <div className="mt-6 space-y-4">
                <select
                    className="block w-full p-2 border rounded"
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value as UserRole)}
                >
                    <option value="">Select Role</option>
                    <option value="writer">Writer</option>
                    <option value="employer">Employer</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                </select>

                <button
                    onClick={testSocketMessage}
                    disabled={!socket || !userRole}
                    className="w-full p-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
                >
                    Test Socket Message
                </button>
            </div>
        </div>
    );
};

export default ConnectionTest;