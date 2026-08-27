import { Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth } from "./auth/RequireAuth";
import { AppShell } from "./components/layout/AppShell";
import { CourseLayout } from "./components/layout/CourseLayout";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { PathPage } from "./pages/PathPage";
import { CategoryPage } from "./pages/CategoryPage";
import { LessonPage } from "./pages/LessonPage";
import { StoryPage } from "./pages/StoryPage";
import { CheckpointPage } from "./pages/CheckpointPage";
import { ProfilePage } from "./pages/ProfilePage";
import { SettingsPage } from "./pages/SettingsPage";
import { FriendsPage } from "./pages/FriendsPage";
import { LeaguesPage } from "./pages/LeaguesPage";
import { NotFoundPage } from "./pages/NotFoundPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/path" replace />} />

        {/* Course-content browsing: sidebar-navigated, journey + one page per category. */}
        <Route element={<CourseLayout />}>
          <Route path="/path" element={<PathPage />} />
          <Route path="/library/:category" element={<CategoryPage />} />
        </Route>

        {/* Focused single-task screens — no sidebar. */}
        <Route path="/lesson" element={<LessonPage />} />
        <Route path="/story/:unitKey/:skillKey" element={<StoryPage />} />
        <Route path="/checkpoint/:unitKey/:skillKey" element={<CheckpointPage />} />

        {/* Account. */}
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/friends" element={<FriendsPage />} />
        <Route path="/leagues" element={<LeaguesPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
