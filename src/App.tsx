import { Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth } from "./auth/RequireAuth";
import { RequireOnboarded } from "./auth/RequireOnboarded";
import { AppShell } from "./components/layout/AppShell";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { OnboardingFlow } from "./pages/onboarding/OnboardingFlow";
import { PathPage } from "./pages/PathPage";
import { CategoryPage } from "./pages/CategoryPage";
import { VocabularyReviewPage } from "./pages/VocabularyReviewPage";
import { LessonPage } from "./pages/LessonPage";
import { StoryPage } from "./pages/StoryPage";
import { PracticePage } from "./pages/PracticePage";
import { CheckpointPage } from "./pages/CheckpointPage";
import { ProfilePage } from "./pages/ProfilePage";
import { SettingsPage } from "./pages/SettingsPage";
import { HelpPage } from "./pages/HelpPage";
import { FriendsPage } from "./pages/FriendsPage";
import { LeaguesPage } from "./pages/LeaguesPage";
import { NotFoundPage } from "./pages/NotFoundPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Signed in but enrolled in nothing. A sibling of /login and /register,
          NOT part of the AppShell group: there is no course yet, so a sidebar
          and a course switcher would have nothing to show. */}
      <Route
        path="/onboarding"
        element={
          <RequireAuth>
            <OnboardingFlow />
          </RequireAuth>
        }
      />

      {/* AppShell now carries the sidebar itself (fixed at the left, every
          authenticated page) rather than a separate CourseLayout wrapper —
          which is also what gives every page a way back to the journey,
          not just the ones under /path and /library.

          RequireOnboarded sits INSIDE RequireAuth: "which course are you in"
          is only a question worth asking once we know who is asking, and the
          answer for a signed-out visitor is /login, not /onboarding. */}
      <Route
        element={
          <RequireAuth>
            <RequireOnboarded>
              <AppShell />
            </RequireOnboarded>
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/path" replace />} />
        <Route path="/path" element={<PathPage />} />
        <Route path="/library/:category" element={<CategoryPage />} />
        {/* Three entry points, one page: with no params the page defaults to
            whole-course scope, :unitKey defaults it to that unit, and both
            params default it to that one lesson — VocabularyReviewPage's own
            tabs let the learner move between scopes from any of them. */}
        <Route path="/vocabulary" element={<VocabularyReviewPage />} />
        <Route path="/vocabulary/:unitKey" element={<VocabularyReviewPage />} />
        <Route path="/vocabulary/:unitKey/:skillKey" element={<VocabularyReviewPage />} />
        <Route path="/lesson" element={<LessonPage />} />
        <Route path="/story/:unitKey/:skillKey" element={<StoryPage />} />
        <Route path="/practice/:unitKey/:skillKey" element={<PracticePage />} />
        <Route path="/checkpoint/:unitKey/:skillKey" element={<CheckpointPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="/friends" element={<FriendsPage />} />
        <Route path="/leagues" element={<LeaguesPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
