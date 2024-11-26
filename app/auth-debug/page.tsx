// app/auth-debug/page.tsx
"use client";

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useEffect, useState } from 'react';

export default function AuthDebug() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function checkAuth() {
      try {
        // Get session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;
        
        if (!session) {
          setDebugInfo({ status: 'No active session' });
          return;
        }

        // Get role
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', session.user.id)
          .single();

        if (roleError) throw roleError;

        setDebugInfo({
          session: {
            userId: session.user.id,
            email: session.user.email,
            emailConfirmed: session.user.email_confirmed_at,
            lastSignIn: session.user.last_sign_in_at,
          },
          role: roleData,
          cookies: document.cookie,
        });

      } catch (error) {
        setError(error instanceof Error ? error.message : 'An error occurred');
      }
    }

    checkAuth();
  }, [supabase]);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Authentication Debug Information</h1>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      <pre className="bg-gray-100 p-4 rounded overflow-auto">
        {JSON.stringify(debugInfo, null, 2)}
      </pre>
    </div>
  );
}