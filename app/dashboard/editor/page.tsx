// app/dashboard/editor/page.tsx
'use client';

import React, { Suspense } from 'react';
import EditorDashboard from './editorui/EditorDashboard';

// Loading Component
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="p-8 bg-white rounded-lg shadow-xl">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-lg font-medium text-slate-600">Loading Dashboard...</p>
        </div>
      </div>
    </div>
  );
}

// Page Component
export default function EditorPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <EditorDashboard />
    </Suspense>
  );
}