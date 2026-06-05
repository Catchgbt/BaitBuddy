import React, { Suspense, useEffect } from 'react'
import './App.css'
import './globals.css'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { NavigationProvider } from '@/lib/NavigationContext'
import { MobileStackProvider } from '@/components/navigation/MobileStackManager'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import PageNotFound from './lib/PageNotFound';
import PageTransition from '@/lib/PageTransitionEnhanced';

import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { migrateOfflineStorage } from '@/lib/StorageMigration';
import ErrorBoundary from '@/lib/ErrorBoundary';
import CatchStats from '@/pages/CatchStats';
import AdminTracking from '@/pages/AdminTracking';
import Help from '@/pages/Help';
import PageViewTracker from '@/components/utils/PageViewTracker';

const LazyPageFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-gray-950">
    <div className="w-8 h-8 border-4 border-gray-700 border-t-cyan-400 rounded-full animate-spin" />
  </div>
);

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return <LazyPageFallback />;
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // AnimatePresence needs location from inside Router
  return <AnimatedRoutes />;
};

const AnimatedRoutes = () => {
  const location = useLocation();
  const { Pages, Layout, mainPage } = pagesConfig;
  const mainPageKey = mainPage ?? Object.keys(Pages)[0];
  const MainPage = mainPageKey ? Pages[mainPageKey] : null;
  
  const LayoutWrapper = ({ children, currentPageName }) => Layout
    ? <Layout currentPageName={currentPageName}>{children}</Layout>
    : <>{children}</>;

  return (
    <Suspense fallback={<LazyPageFallback />}>
      <AnimatePresence initial={false}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={
            <ErrorBoundary>
              <LayoutWrapper currentPageName={mainPageKey}>
                {MainPage && <MainPage />}
              </LayoutWrapper>
            </ErrorBoundary>
          } />
          {Object.entries(Pages).map(([path, Page]) => (
            <Route
              key={path}
              path={`/${path}`}
              element={
                <ErrorBoundary>
                  <LayoutWrapper currentPageName={path}>
                    <Page />
                  </LayoutWrapper>
                </ErrorBoundary>
              }
            />
          ))}
          <Route path="/CatchStats" element={
            <ErrorBoundary>
              <LayoutWrapper currentPageName="CatchStats">
                <CatchStats />
              </LayoutWrapper>
            </ErrorBoundary>
          } />
          <Route path="/AdminTracking" element={
            <ErrorBoundary>
              <LayoutWrapper currentPageName="AdminTracking">
                <AdminTracking />
              </LayoutWrapper>
            </ErrorBoundary>
          } />
          <Route path="/Help" element={
            <ErrorBoundary>
              <LayoutWrapper currentPageName="Help">
                <Help />
              </LayoutWrapper>
            </ErrorBoundary>
          } />
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </AnimatePresence>
    </Suspense>
  );
};


function App() {
  // Initialize storage migration on app startup
  useEffect(() => {
    migrateOfflineStorage().catch(err => {
      console.error('[App] Storage migration failed:', err);
    });
  }, []);

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <MobileStackProvider>
          <Router>
            <NavigationProvider>
              <NavigationTracker />
              <PageViewTracker />
              <AuthenticatedApp />
            </NavigationProvider>
          </Router>
        </MobileStackProvider>
        <Toaster />
        <VisualEditAgent />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App