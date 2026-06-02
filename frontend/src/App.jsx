import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import Layout from './Layout';
import Home from './pages/Home';
import AIAssistant from './pages/AIAssistant';
import Log from './pages/Log';
import Map from './pages/Map';
import Community from './pages/Community';
import Premium from './pages/Premium';
import Login from './pages/Login';

const queryClient = new QueryClient();

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><div className="w-8 h-8 border-4 border-gray-700 border-t-cyan-400 rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/login" />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Home />} />
        <Route path="chat" element={<AIAssistant />} />
        <Route path="log" element={<Log />} />
        <Route path="map" element={<Map />} />
        <Route path="community" element={<Community />} />
        <Route path="premium" element={<Premium />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppRoutes />
          <Toaster richColors position="top-center" />
        </BrowserRouter>
      </QueryClientProvider>
    </AuthProvider>
  );
}
