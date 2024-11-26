// app/components/DashboardTest.tsx
import React, { useState, useEffect } from 'react';
import { Socket, io } from 'socket.io-client';
import api from '@/lib/api';
import { supabase } from '@/lib/supabase';

interface DashboardFeature {
  name: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  testData?: any;
}

interface TestResult {
  status: 'pending' | 'success' | 'failed';
  message: string;
}

const dashboardFeatures: Record<string, DashboardFeature[]> = {
  writer: [
    { name: 'Get Writer Profile', endpoint: '/api/writer/profile', method: 'GET' },
    { name: 'Get Available Jobs', endpoint: '/api/writer/jobs', method: 'GET' },
    { name: 'Get Active Projects', endpoint: '/api/writer/projects', method: 'GET' },
    { name: 'Check Messages', endpoint: '/api/chat/writer', method: 'GET' }
  ],
  employer: [
    { name: 'Get Employer Profile', endpoint: '/api/employer/profile', method: 'GET' },
    { name: 'Get Posted Jobs', endpoint: '/api/employer/jobs', method: 'GET' },
    { name: 'Get Hired Writers', endpoint: '/api/employer/writers', method: 'GET' },
    { name: 'Check Messages', endpoint: '/api/chat/employer', method: 'GET' }
  ],
  editor: [
    { name: 'Get Editor Profile', endpoint: '/api/editor/profile', method: 'GET' },
    { name: 'Get Assigned Projects', endpoint: '/api/editor/projects', method: 'GET' },
    { name: 'Get Writer Reviews', endpoint: '/api/editor/reviews', method: 'GET' },
    { name: 'Check Messages', endpoint: '/api/chat/editor', method: 'GET' }
  ],
  admin: [
    { name: 'Get Admin Dashboard', endpoint: '/api/admin/dashboard', method: 'GET' },
    { name: 'Get All Users', endpoint: '/api/admin/users', method: 'GET' },
    { name: 'Get System Stats', endpoint: '/api/admin/stats', method: 'GET' },
    { name: 'Check Messages', endpoint: '/api/chat/admin', method: 'GET' }
  ]
};

const DashboardTest = () => {
  const [userRole, setUserRole] = useState<string>('');
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [socket, setSocket] = useState<Socket | null>(null);
  const [socketStatus, setSocketStatus] = useState<TestResult>({ 
    status: 'pending', 
    message: 'Not connected' 
  });

  // Test a specific endpoint
  const testEndpoint = async (feature: DashboardFeature) => {
    try {
      const response = await api({
        method: feature.method,
        url: feature.endpoint,
        data: feature.testData
      });

      setTestResults(prev => ({
        ...prev,
        [feature.name]: {
          status: 'success',
          message: `Success: ${JSON.stringify(response.data).substring(0, 50)}...`
        }
      }));
    } catch (error: any) {
      setTestResults(prev => ({
        ...prev,
        [feature.name]: {
          status: 'failed',
          message: `Error: ${error.message}`
        }
      }));
    }
  };

  // Test socket connection
  const setupSocketConnection = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No auth token available');

      const socketInstance = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000', {
        auth: { token: session.access_token },
        withCredentials: true
      });

      socketInstance.on('connect', () => {
        setSocketStatus({
          status: 'success',
          message: 'Socket connected successfully'
        });
        setSocket(socketInstance);
      });

      socketInstance.on('connect_error', (error) => {
        setSocketStatus({
          status: 'failed',
          message: `Socket connection failed: ${error.message}`
        });
      });
    } catch (error: any) {
      setSocketStatus({
        status: 'failed',
        message: `Socket setup error: ${error.message}`
      });
    }
  };

  // Run tests when role changes
  useEffect(() => {
    if (userRole && dashboardFeatures[userRole]) {
      dashboardFeatures[userRole].forEach(feature => {
        testEndpoint(feature);
      });
      setupSocketConnection();
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [userRole]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Dashboard Functionality Test</h2>
      
      <div className="mb-6">
        <select
          className="w-full p-2 border rounded"
          value={userRole}
          onChange={(e) => setUserRole(e.target.value)}
        >
          <option value="">Select Role to Test</option>
          <option value="writer">Writer Dashboard</option>
          <option value="employer">Employer Dashboard</option>
          <option value="editor">Editor Dashboard</option>
          <option value="admin">Admin Dashboard</option>
        </select>
      </div>

      {userRole && (
        <div className="space-y-6">
          <div className="p-4 border rounded">
            <h3 className="font-semibold mb-2">Socket Connection Status</h3>
            <div className={`${
              socketStatus.status === 'success' ? 'text-green-600' :
              socketStatus.status === 'failed' ? 'text-red-600' :
              'text-yellow-600'
            }`}>
              {socketStatus.message}
            </div>
          </div>

          <div className="grid gap-4">
            {dashboardFeatures[userRole].map((feature) => (
              <div key={feature.name} className="p-4 border rounded">
                <h3 className="font-semibold mb-2">{feature.name}</h3>
                <div className={`${
                  testResults[feature.name]?.status === 'success' ? 'text-green-600' :
                  testResults[feature.name]?.status === 'failed' ? 'text-red-600' :
                  'text-yellow-600'
                }`}>
                  {testResults[feature.name]?.message || 'Testing...'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardTest;