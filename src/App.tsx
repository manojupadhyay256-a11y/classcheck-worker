import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import { PushNotifications } from '@capacitor/push-notifications';
import { Device } from '@capacitor/device';
import { notificationService } from './lib/notifications';
import Layout from './components/layout/Layout';
import ErrorBoundary from './components/common/ErrorBoundary';
import SignIn from './pages/auth/SignIn';
import SignUp from './pages/auth/SignUp';
import AdminDashboard from './pages/admin/Dashboard';
import AdminClasses from './pages/admin/Classes';
import AdminStudents from './pages/admin/Students';
import AdminTeachers from './pages/admin/Teachers';
import AdminSubjectAssignments from './pages/admin/SubjectAssignments';
import BulkImport from './pages/admin/BulkImport';
import Settings from './pages/admin/Settings';
import TeacherLogins from './pages/admin/TeacherLogins';
import AdminLogBook from './pages/admin/LogBook';
import AdminSyllabus from './pages/admin/Syllabus';
import AttendanceReport from './pages/admin/AttendanceReport';
// ... rest of imports
import TeacherDashboard from './pages/teacher/Dashboard';
import TeacherAttendance from './pages/teacher/Attendance';
import TeacherStudents from './pages/teacher/StudentsPage';
import TeacherReports from './pages/teacher/Reports';
import TeacherMySubjects from './pages/teacher/MySubjects';
import TeacherSyllabus from './pages/teacher/Syllabus';
import TeacherLogBook from './pages/teacher/LogBook';
import StudentDailyDiary from './pages/student/DailyDiary';
import StudentDashboard from './pages/student/Dashboard';
import StudentAttendance from './pages/student/Attendance';
import StudentSubjects from './pages/student/Subjects';
import StudentSyllabus from './pages/student/Syllabus';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import { useAuthStore } from './stores/authStore';
import { AlertCircle, RefreshCw } from 'lucide-react';

const App = () => {
  const { profile, loading, fetchProfile } = useAuthStore();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    fetchProfile();

    // 10 second timeout for initialization
    const timer = setTimeout(() => {
      if (useAuthStore.getState().loading) {
        console.warn('[App] Initialization timed out after 10s');
        setTimedOut(true);
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [fetchProfile]);

  // --- Lazy Notification Init ---
  // Only request permissions and register for push AFTER the dashboard UI
  // has successfully rendered (profile loaded, loading complete).
  // This prevents FCM from crashing the app during initial boot on Android.
  useEffect(() => {
    if (loading || !profile) return;

    const setupNotifications = async () => {
      try {
        const info = await Device.getInfo();
        if (info.platform === 'android' || info.platform === 'ios') {
          // 1. Request Permission
          let status = await PushNotifications.checkPermissions();
          if (status.receive === 'prompt') {
            status = await PushNotifications.requestPermissions();
          }

          if (status.receive !== 'granted') {
            console.warn('[App] Push permissions not granted');
            return;
          }

          // 2. Handle Registration Success (Get Token)
          // Setup listener BEFORE calling register() to ensure we catch the event
          PushNotifications.addListener('registration', async ({ value: token }) => {
            console.log('[App] Push registration event received');
            const authStatus = useAuthStore.getState();
            if (authStatus.profile?.id) {
              await notificationService._saveTokenToDb(
                authStatus.profile.id,
                authStatus.profile.role as any,
                token
              );
              console.log('[App] Mobile FCM token saved successfully via registration event');
            }
          });

          // Handle Registration Error
          PushNotifications.addListener('registrationError', (error: any) => {
            console.error('[App] Push registration error:', error);
          });

          // 3. Create Notification Channel (Required for Android 8+)
          await PushNotifications.createChannel({
            id: 'default',
            name: 'Default',
            description: 'General notifications',
            importance: 5, // High importance
            visibility: 1,
            sound: 'default',
            vibration: true
          });

          // 4. Register with FCM/APNS
          await PushNotifications.register();
        }
      } catch (err) {
        // Catch-all: never let notification setup crash the app
        console.warn('[App] Setup notifications failed:', err);
      }
    };
    setupNotifications();
  }, [loading, profile]);

  const handleRetry = () => {
    setTimedOut(false);
    fetchProfile();
    // Restart timeout
    setTimeout(() => {
      if (useAuthStore.getState().loading) {
        setTimedOut(true);
      }
    }, 10000);
  };

  const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
    if (loading) {
      if (timedOut) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6 text-center">
            <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8 text-amber-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Connection Timeout</h2>
              <p className="text-gray-500 text-sm mb-8">
                The application is taking longer than expected to load. This might be due to a poor internet connection or a database issue.
              </p>
              <button
                onClick={handleRetry}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
              >
                <RefreshCw className="w-4 h-4" />
                Retry Connection
              </button>
            </div>
          </div>
        );
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 uppercase tracking-widest font-bold text-gray-400 animate-pulse">
          Loading Session...
        </div>
      );
    }
    if (!profile) return <Navigate to="/signin" replace />;
    if (allowedRoles && !allowedRoles.includes(profile.role)) {
      return <Navigate to={profile.role === 'admin' ? '/admin' : '/teacher'} replace />;
    }
    return <>{children}</>;
  };

  return (
    <ErrorBoundary>
      <Toaster position="top-center" richColors closeButton />
      <Router>
        <BackButtonHandler />
        <Routes>
          <Route path="/signin" element={<ErrorBoundary><SignIn /></ErrorBoundary>} />
          <Route path="/signup" element={<ErrorBoundary><SignUp /></ErrorBoundary>} />

          <Route path="/admin/*" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <ErrorBoundary fallbackRoute="/signin">
                <Layout>
                  <Routes>
                    <Route path="/" element={<AdminDashboard />} />
                    <Route path="/teachers" element={<AdminTeachers />} />
                    <Route path="/classes" element={<AdminClasses />} />
                    <Route path="/subject-assignments" element={<AdminSubjectAssignments />} />
                    <Route path="/students" element={<AdminStudents />} />
                    <Route path="/bulk-import" element={<BulkImport />} />
                    <Route path="/reports/attendance" element={<AttendanceReport />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/teacher-logins" element={<TeacherLogins />} />
                    <Route path="/log-book" element={<AdminLogBook />} />
                    <Route path="/syllabus" element={<AdminSyllabus />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/notifications" element={<Notifications />} />
                  </Routes>
                </Layout>
              </ErrorBoundary>
            </ProtectedRoute>
          } />

          <Route path="/teacher/*" element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <ErrorBoundary fallbackRoute="/signin">
                <Layout>
                  <Routes>
                    <Route path="/" element={<TeacherDashboard />} />
                    <Route path="/attendance" element={<TeacherAttendance />} />
                    <Route path="/my-subjects" element={<TeacherMySubjects />} />
                    <Route path="/syllabus/:classSubjectId" element={<TeacherSyllabus />} />
                    <Route path="/students" element={<TeacherStudents />} />
                    <Route path="/log-book" element={<TeacherLogBook />} />
                    <Route path="/reports" element={<TeacherReports />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/notifications" element={<Notifications />} />
                  </Routes>
                </Layout>
              </ErrorBoundary>
            </ProtectedRoute>
          } />

          <Route path="/student/*" element={
            <ProtectedRoute allowedRoles={['student']}>
              <ErrorBoundary fallbackRoute="/signin">
                <Layout>
                  <Routes>
                    <Route path="" element={<StudentDashboard />} />
                    <Route path="diary" element={<StudentDailyDiary />} />
                    <Route path="attendance" element={<StudentAttendance />} />
                    <Route path="subjects" element={<StudentSubjects />} />
                    <Route path="syllabus/:classSubjectId" element={<StudentSyllabus />} />
                    <Route path="profile" element={<Profile />} />
                    <Route path="notifications" element={<Notifications />} />
                  </Routes>
                </Layout>
              </ErrorBoundary>
            </ProtectedRoute>
          } />

          <Route path="/" element={<Navigate to="/signin" replace />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
};

/** Handles Android hardware back button globally */
const BackButtonHandler = () => {
  const location = useLocation();

  useEffect(() => {
    const handler = CapacitorApp.addListener('backButton', () => {
      // Root pages where pressing back should exit the app
      const rootPaths = ['/signin', '/signup', '/admin', '/teacher', '/student'];
      const currentPath = location.pathname.replace(/\/$/, '') || '/';
      const isRootPage = rootPaths.includes(currentPath) || currentPath === '/';

      if (isRootPage) {
        CapacitorApp.exitApp();
      } else {
        // Use window.history for reliable SPA back navigation in Capacitor
        window.history.back();
      }
    });

    return () => {
      handler.then(h => h.remove());
    };
  }, [location.pathname]);

  return null;
};

export default App;
