'use client';

import { AuthProvider } from './context/AuthContext';
import { Dashboard } from './components/Dashboard';

export default function Home() {
  return (
    <AuthProvider>
      <Dashboard />
    </AuthProvider>
  );
}
