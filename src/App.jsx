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
import { ThemeProvider } from '@/lib/ThemeContext';
import SplashIntro from '@/components/intro/SplashIntro';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { migrateOfflineStorage } from '@/lib/StorageMigration';
import ErrorBoundary from '@/lib/ErrorBoundary';
import CatchStats from '@/pages/CatchStats';
import AdminTracking from '@/pages/AdminTracking';
import Help from '@/pages/Help';
import EventCatalog from '@/pages/EventCatalog';
import EventDetails from '@/pages/EventDetails';
import EventCreate from '@/pages/EventCreate';
import MonthlyLeaderboard from '@/pages/MonthlyLeaderboard';
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

  const currentPageName = location.pathname === '/'
    ? mainPageKey
    : location.pathname.slice(1);

  const routeContent = (
    <Suspense fallback={<LazyPageFallback />}>
      <AnimatePresence initial={false}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={
            <ErrorBoundary>
              {MainPage && <MainPage />}
            </ErrorBoundary>
          } />
          {Object.entries(Pages).map(([path, Page]) => (
            <Route
              key={path}
              path={`/${path}`}
              element={
                <ErrorBoundary>
                  <Page />
                </ErrorBoundary>
              }
            />
          ))}
          <Route path="/CatchStats" element={
            <ErrorBoundary><CatchStats /></ErrorBoundary>
          } />
          <Route path="/AdminTracking" element={
            <ErrorBoundary><AdminTracking /></ErrorBoundary>
          } />
          <Route path="/Help" element={
            <ErrorBoundary><Help /></ErrorBoundary>
          } />
          <Route path="/events-catalog" element={
            <ErrorBoundary><EventCatalog /></ErrorBoundary>
          } />
          <Route path="/events/create" element={
            <ErrorBoundary><EventCreate /></ErrorBoundary>
          } />
          <Route path="/events/:eventId" element={
            <ErrorBoundary><EventDetails /></ErrorBoundary>
          } />
          <Route path="/leaderboards/monthly" element={
            <ErrorBoundary><MonthlyLeaderboard /></ErrorBoundary>
          } />
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </AnimatePresence>
    </Suspense>
  );

  if (!Layout) return routeContent;

  return (
    <Layout currentPageName={currentPageName}>
      {routeContent}
    </Layout>
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
    <ErrorBoundary>
      <SplashIntro />
      <AuthProvider>
        <ThemeProvider>
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
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App