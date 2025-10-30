import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { StoreProvider } from './context/StoreContext';
import { ThemeProvider } from './context/ThemeContext';
import { SettingsProvider } from './context/SettingsContext';
import { NotificationProvider } from './context/NotificationContext';
import { RiderProvider } from './context/RiderContext';
import { NavigationProvider } from './context/NavigationContext';
import { RefreshProvider } from './context/RefreshContext';
import { GoalProvider } from './context/GoalContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Header } from './components/navigation/Header';
import { MobileNavigation } from './components/navigation/MobileNavigation';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Products } from './pages/Products';
import { POS } from './pages/POS';
import { Inventory } from './pages/Inventory';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { Expenses } from './pages/Expenses';
import { Audit } from './pages/Audit';
import { RiderManagementPage } from './pages/RiderManagement';
import { CashTrackingPage } from './pages/CashTracking';
import { SalesHistory } from './pages/SalesHistory';
import { CustomerCatalog } from './pages/CustomerCatalog';
import { OrderTracking } from './pages/OrderTracking';
import { AdminCustomerOrders } from './pages/AdminCustomerOrders';
import { ScrollToTopWrapper } from './components/ScrollToTopWrapper';
import { GoalCelebrationManager } from './components/ui/GoalCelebrationManager';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <SettingsProvider>
          <RiderProvider>
            <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <ErrorBoundary>
                <AuthProvider>
                  <NotificationProvider>
                    <StoreProvider>
                      <AppProvider>
                        <GoalProvider>
                          <RefreshProvider>
                            <NavigationProvider>
                  <ScrollToTopWrapper>
                  <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
                <GoalCelebrationManager />
                <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={
                <ProtectedRoute requiredRole={['admin', 'owner', 'manager', 'cashier']}>
                  <Header />
                  <main className="pt-0 pb-24 bg-white dark:bg-gray-900 min-h-screen transition-colors duration-300">
                    <POS />
                  </main>
                  <MobileNavigation />
                </ProtectedRoute>
              } />
              <Route path="/pos" element={
                <ProtectedRoute requiredRole={['admin', 'owner', 'manager', 'cashier']}>
                  <Header />
                  <main className="pt-0 pb-24 bg-white dark:bg-gray-900 min-h-screen transition-colors duration-300">
                    <POS />
                  </main>
                  <MobileNavigation />
                </ProtectedRoute>
              } />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Header />
                  <main className="pt-0 bg-white dark:bg-gray-900 min-h-screen transition-colors duration-300">
                    <Dashboard />
                  </main>
                  <MobileNavigation />
                </ProtectedRoute>
              } />
              <Route path="/products" element={
                <ProtectedRoute requiredRole={['admin', 'owner', 'manager', 'cashier']}>
                  <Header />
                  <main className="pt-0 bg-white dark:bg-gray-900 min-h-screen transition-colors duration-300">
                    <Products />
                  </main>
                  <MobileNavigation />
                </ProtectedRoute>
              } />
              <Route path="/inventory" element={
                <ProtectedRoute requiredRole={['admin', 'owner', 'manager']}>
                  <Header />
                  <main className="pt-0 pb-24 bg-white dark:bg-gray-900 min-h-screen transition-colors duration-300">
                    <Inventory />
                  </main>
                  <MobileNavigation />
                </ProtectedRoute>
              } />
              <Route path="/sales-history" element={
                <ProtectedRoute requiredRole={['admin', 'owner', 'manager', 'cashier']}>
                  <Header />
                  <main className="pt-0 pb-24 bg-white dark:bg-gray-900 min-h-screen transition-colors duration-300">
                    <SalesHistory />
                  </main>
                  <MobileNavigation />
                </ProtectedRoute>
              } />
              <Route path="/reports" element={
                <ProtectedRoute requiredRole={['admin', 'owner', 'manager', 'cashier']}>
                  <Header />
                  <main className="pt-0 pb-24 bg-white dark:bg-gray-900 min-h-screen transition-colors duration-300">
                    <Reports />
                  </main>
                  <MobileNavigation />
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute requiredRole={['admin', 'owner', 'manager', 'cashier']}>
                  <Header />
                  <main className="pt-0 pb-24 bg-white dark:bg-gray-900 min-h-screen transition-colors duration-300">
                    <Settings />
                  </main>
                  <MobileNavigation />
                </ProtectedRoute>
              } />
              <Route path="/expenses" element={
                <ProtectedRoute requiredRole={['admin', 'owner', 'manager', 'cashier']}>
                  <Header />
                  <main className="pt-0 pb-24 bg-white dark:bg-gray-900 min-h-screen transition-colors duration-300">
                    <Expenses />
                  </main>
                  <MobileNavigation />
                </ProtectedRoute>
              } />
              <Route path="/audit" element={
                <ProtectedRoute requiredRole={['admin', 'owner', 'manager']}>
                  <Header />
                  <main className="pt-0 pb-24 bg-white dark:bg-gray-900 min-h-screen transition-colors duration-300">
                    <Audit />
                  </main>
                  <MobileNavigation />
                </ProtectedRoute>
              } />
              <Route path="/riders" element={
                <ProtectedRoute requiredRole={['admin', 'owner', 'manager']}>
                  <Header />
                  <main className="pt-0 pb-24 bg-white dark:bg-gray-900 min-h-screen transition-colors duration-300">
                    <RiderManagementPage />
                  </main>
                  <MobileNavigation />
                </ProtectedRoute>
              } />
              <Route path="/cash-tracking" element={
                <ProtectedRoute requiredRole={['admin', 'owner', 'manager']}>
                  <Header />
                  <main className="pt-0 pb-24 bg-white dark:bg-gray-900 min-h-screen transition-colors duration-300">
                    <CashTrackingPage />
                  </main>
                  <MobileNavigation />
                </ProtectedRoute>
              } />
              <Route path="/admin/customer-orders" element={
                <ProtectedRoute requiredRole={['admin', 'owner', 'manager']}>
                  <Header />
                  <main className="pt-0 pb-24 bg-white dark:bg-gray-900 min-h-screen transition-colors duration-300">
                    <AdminCustomerOrders />
                  </main>
                  <MobileNavigation />
                </ProtectedRoute>
              } />
              {/* Public routes - no authentication required */}
              <Route path="/catalog" element={<CustomerCatalog />} />
              <Route path="/track-order" element={<OrderTracking />} />
            </Routes>
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 2000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  style: {
                    background: '#22c55e',
                    color: '#fff',
                  },
                },
                error: {
                  duration: 1000, // Shorter duration for errors
                  style: {
                    background: '#6b7280', // Less alarming gray color
                    color: '#fff',
                    opacity: 0.8, // Make it less prominent
                  },
                },
              }}
            />
                  </div>
                  </ScrollToTopWrapper>
                            </NavigationProvider>
                          </RefreshProvider>
                        </GoalProvider>
                      </AppProvider>
                    </StoreProvider>
                  </NotificationProvider>
                </AuthProvider>
              </ErrorBoundary>
            </Router>
          </RiderProvider>
        </SettingsProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
