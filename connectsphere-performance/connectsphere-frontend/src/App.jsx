import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import ProtectedRoute from './components/layout/ProtectedRoute.jsx';
import AppLayout from './components/layout/AppLayout.jsx';
import Spinner from './components/ui/Spinner.jsx';

// Each page is its own chunk — the browser only downloads the screen in use.
const Login = lazy(() => import('./pages/auth/Login.jsx'));
const Register = lazy(() => import('./pages/auth/Register.jsx'));
const FeedPage = lazy(() => import('./pages/FeedPage.jsx'));
const ExplorePage = lazy(() => import('./pages/ExplorePage.jsx'));
const ReelsPage = lazy(() => import('./pages/ReelsPage.jsx'));
const SavedPage = lazy(() => import('./pages/SavedPage.jsx'));
const HashtagPage = lazy(() => import('./pages/HashtagPage.jsx'));
const MessagesPage = lazy(() => import('./pages/MessagesPage.jsx'));
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx'));
const PostPage = lazy(() => import('./pages/PostPage.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));

function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner size={28} />
    </div>
  );
}

function PublicOnly({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  return isAuthenticated ? <Navigate to="/" replace /> : children;
}

export default function App() {
  return (
    // Top-level boundary covers the auth pages + first layout paint; the inner
    // boundary inside AppLayout keeps the shell stable during in-app navigation.
    <Suspense fallback={<FullPageLoader />}>
      <Routes>
        <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
        <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/" element={<FeedPage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/reels" element={<ReelsPage />} />
          <Route path="/saved" element={<SavedPage />} />
          <Route path="/search" element={<Navigate to="/explore" replace />} />
          <Route path="/tag/:tag" element={<HashtagPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/messages/:conversationId" element={<MessagesPage />} />
          <Route path="/post/:id" element={<PostPage />} />
          <Route path="/u/:username" element={<ProfilePage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
