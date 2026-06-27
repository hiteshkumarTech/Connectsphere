import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import ProtectedRoute from './components/layout/ProtectedRoute.jsx';
import AppLayout from './components/layout/AppLayout.jsx';
import Spinner from './components/ui/Spinner.jsx';
import Login from './pages/auth/Login.jsx';
import Register from './pages/auth/Register.jsx';
import FeedPage from './pages/FeedPage.jsx';
import ExplorePage from './pages/ExplorePage.jsx';
import ReelsPage from './pages/ReelsPage.jsx';
import SavedPage from './pages/SavedPage.jsx';
import HashtagPage from './pages/HashtagPage.jsx';
import MessagesPage from './pages/MessagesPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import PostPage from './pages/PostPage.jsx';
import NotFound from './pages/NotFound.jsx';

function PublicOnly({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size={28} />
      </div>
    );
  return isAuthenticated ? <Navigate to="/" replace /> : children;
}

export default function App() {
  return (
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
  );
}
