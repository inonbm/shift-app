import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { ProtectedRoute } from './components/ui/ProtectedRoute';
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import { AppLayout } from './components/layout/AppLayout';

import { LoginPage } from './features/auth/LoginPage';
import { TrainerDashboard } from './features/trainer/TrainerDashboard';
import { TraineeForm } from './features/trainer/TraineeForm';
import { TraineeDetail } from './features/trainer/TraineeDetail';
import { FoodsManager } from './features/trainer/FoodsManager';
import { WorkoutTemplateForm } from './features/trainer/WorkoutTemplateForm';
import { AdminDashboard } from './features/admin/AdminDashboard';
import { DietView } from './features/trainee/DietView';
import { WorkoutHub } from './features/trainee/WorkoutHub';
import { ActiveWorkout } from './features/trainee/ActiveWorkout';

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
              <Navigate to={
                profile.role === 'admin' ? '/admin' : 
                profile.role === 'trainer' ? '/trainer' : '/diet'
              } replace />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />

        {/* Protected Routes wrapped in AppLayout */}
        <Route element={<AppLayout />}>
          
          {/* Trainer Routes (Admins allowed into TraineeDetail) */}
          <Route 
            path="/trainer" 
            element={
              <ProtectedRoute requiredRole="trainer">
                <TrainerDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/trainer/trainees/new" 
            element={
              <ProtectedRoute requiredRole="trainer">
                <TraineeForm />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/trainer/trainees/:id" 
            element={
              <ProtectedRoute requiredRole={['trainer', 'admin']}>
                <TraineeDetail />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/trainer/workouts/new" 
            element={
              <ProtectedRoute requiredRole={['trainer', 'admin']}>
                <WorkoutTemplateForm />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/trainer/foods" 
            element={
              <ProtectedRoute requiredRole={['trainer', 'admin']}>
                <FoodsManager />
              </ProtectedRoute>
            } 
          />

          {/* Admin Routes */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
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
          <Route 
            path="/workouts" 
            element={
              <ProtectedRoute requiredRole="trainee">
                <WorkoutHub />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/workouts/active/:templateId" 
            element={
              <ProtectedRoute requiredRole="trainee">
                <ActiveWorkout />
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
