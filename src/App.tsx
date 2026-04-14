import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { ProtectedRoute } from './components/ui/ProtectedRoute';
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import { AppLayout } from './components/layout/AppLayout';

// Placeholders for Phase 1
import { LoginPage, TrainerDashboard, DietView } from './features/placeholders';

function App() {
  const { initialize, isLoading, user, profile } = useAuthStore();

  // Initialize auth session on app mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Login Route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Root redirect based on role */}
        <Route 
          path="/" 
          element={
            user && profile ? (
              <Navigate to={profile.role === 'trainer' ? '/trainer' : '/diet'} replace />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />

        {/* Protected Routes wrapped in AppLayout */}
        <Route element={<AppLayout />}>
          
          {/* Trainer Routes */}
          <Route 
            path="/trainer/*" 
            element={
              <ProtectedRoute requiredRole="trainer">
                <TrainerDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Trainee Routes */}
          <Route 
            path="/diet/*" 
            element={
              <ProtectedRoute requiredRole="trainee">
                <DietView />
              </ProtectedRoute>
            } 
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
