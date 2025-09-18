import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { StoreProvider } from './context/StoreContext';
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

function App() {
  return (
        <AuthProvider>
          <StoreProvider>
            <AppProvider>
              <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <div className="min-h-screen bg-gray-50">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={
                <ProtectedRoute requiredRole={['admin', 'owner', 'manager', 'cashier']}>
                  <Header />
                  <main className="pt-0 pb-24">
                    <POS />
                  </main>
                  <MobileNavigation />
                </ProtectedRoute>
              } />
              <Route path="/pos" element={
                <ProtectedRoute requiredRole={['admin', 'owner', 'manager', 'cashier']}>
                  <Header />
                  <main className="pt-0 pb-24">
                    <POS />
                  </main>
                  <MobileNavigation />
                </ProtectedRoute>
              } />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Header />
                  <main className="pt-0">
                    <Dashboard />
                  </main>
                  <MobileNavigation />
                </ProtectedRoute>
              } />
              <Route path="/products" element={
                <ProtectedRoute requiredRole={['admin', 'owner', 'manager']}>
                  <Header />
                  <main className="pt-0">
                    <Products />
                  </main>
                  <MobileNavigation />
                </ProtectedRoute>
              } />
              <Route path="/inventory" element={
                <ProtectedRoute requiredRole={['admin', 'owner', 'manager']}>
                  <Header />
                  <main className="pt-0 pb-24">
                    <Inventory />
                  </main>
                  <MobileNavigation />
                </ProtectedRoute>
              } />
              <Route path="/reports" element={
                <ProtectedRoute requiredRole={['admin', 'owner', 'manager']}>
                  <Header />
                  <main className="pt-0 pb-24">
                    <Reports />
                  </main>
                  <MobileNavigation />
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute requiredRole={['admin', 'owner']}>
                  <Header />
                  <main className="pt-0 pb-24">
                    <Settings />
                  </main>
                  <MobileNavigation />
                </ProtectedRoute>
              } />
              <Route path="/expenses" element={
                <ProtectedRoute requiredRole={['admin', 'owner', 'manager']}>
                  <Header />
                  <main className="pt-0 pb-24">
                    <Expenses />
                  </main>
                  <MobileNavigation />
                </ProtectedRoute>
              } />
            </Routes>
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 3000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
              }}
            />
          </div>
          </Router>
        </AppProvider>
      </StoreProvider>
    </AuthProvider>
  );
}

export default App;
