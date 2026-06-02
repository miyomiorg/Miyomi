import React, { useState, useEffect } from "react";
import { Toaster } from "./components/ui/sonner";
import { ThemeProvider } from "./components/ThemeProvider";
import { LikeProvider } from "./context/LikeContext";
import { Navbar } from "./components/Navbar";
import { BottomNavigation } from "./components/BottomNavigation";
import { Footer } from "./components/Footer";
import { NoticeBanner } from "./components/NoticeBanner";
import { QuotaRibbon } from "./components/QuotaRibbon";
import { HomePage } from "./pages/HomePage";
import { SoftwarePage } from "./pages/SoftwarePage";
import { ExtensionsPage } from "./pages/ExtensionsPage";
import { GuidesPage } from "./pages/GuidesPage";
import { GuideDetailPage } from "./pages/GuideDetailPage";
import { FAQPage } from "./pages/FAQPage";
import { AboutPage } from "./pages/AboutPage";
import { AppDetailPage } from "./pages/AppDetailPage";
import { ExtensionDetailPage } from "./pages/ExtensionDetailPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { SearchPage } from "./pages/SearchPage";
import { DonatePage } from "./pages/DonatePage";
import { SubmitPage } from "./pages/SubmitPage";
import { ChristmasSnow } from './components/ChristmasSnow';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminAppsPage } from './pages/admin/AdminAppsPage';
import { AdminAppFormPage } from './pages/admin/AdminAppFormPage';
import { AdminExtensionsPage } from './pages/admin/AdminExtensionsPage';
import { AdminExtensionFormPage } from './pages/admin/AdminExtensionFormPage';
import { AdminGuidesPage } from './pages/admin/AdminGuidesPage';
import { AdminGuideEditorPage } from './pages/admin/AdminGuideEditorPage';
import { AdminFAQsPage } from './pages/admin/AdminFAQsPage';
import { AdminFAQEditorPage } from './pages/admin/AdminFAQEditorPage';
import { AdminSubmissionsPage } from './pages/admin/AdminSubmissionsPage';
import { AdminLikesPage } from './pages/admin/AdminLikesPage';
import { AdminNoticesPage } from './pages/admin/AdminNoticesPage';
import { AdminDonationsPage } from './pages/admin/AdminDonationsPage';
import { AdminThemesPage } from './pages/admin/AdminThemesPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';
import { AdminLogsPage } from './pages/admin/AdminLogsPage';
import { AdminSessionsPage } from './pages/admin/AdminSessionsPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminEditSuggestionsPage } from './pages/admin/AdminEditSuggestionsPage';
import { AdminReportsPage } from './pages/admin/AdminReportsPage';
import { AdminFeedbacksPage } from './pages/admin/AdminFeedbacksPage';
import { AdminLayout } from './components/admin/AdminLayout';
import { ProtectedRoute } from './components/admin/ProtectedRoute';
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  useParams,
  useLocation,
} from "react-router-dom";

function AppDetailPageWrapper({
  onNavigate,
}: {
  onNavigate: (path: string) => void;
}) {
  const { appId } = useParams<{ appId: string }>();
  return (
    <React.Fragment key={appId}>
      <AppDetailPage
        appId={appId || ""}
        onNavigate={onNavigate}
      />
    </React.Fragment>
  );
}

function ExtensionDetailPageWrapper({
  onNavigate,
}: {
  onNavigate: (path: string) => void;
}) {
  const { slug } = useParams<{ slug: string }>();
  return (
    <React.Fragment key={slug}>
      <ExtensionDetailPage
        extensionId={slug || ""}
        onNavigate={onNavigate}
      />
    </React.Fragment>
  );
}

function GuideDetailPageWrapper({
  onNavigate,
}: {
  onNavigate: (path: string) => void;
}) {
  const { slug } = useParams<{ slug: string }>();
  return (
    <GuideDetailPage
      slug={slug || ""}
      onNavigate={onNavigate}
    />
  );
}

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleNavigate = (path: string) => {
    const currentScrollY = window.scrollY;
    navigate(path, {
      state: {
        previousScrollPosition: currentScrollY,
        fromNavigation: true
      }
    });
    // Scroll to top for new pages  
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Admin routes get their own layout (no Navbar/Footer)
  if (isAdminRoute) {
    return (
      <>
        <Toaster position="top-center" />
        <Routes>
          <Route path="/admin" element={<AdminLoginPage />} />
          <Route path="/admin/*" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
            <Route path="dashboard" element={<AdminDashboardPage />} />
            <Route path="apps" element={<AdminAppsPage />} />
            <Route path="apps/new" element={<AdminAppFormPage />} />
            <Route path="apps/:id/edit" element={<AdminAppFormPage />} />
            <Route path="extensions" element={<AdminExtensionsPage />} />
            <Route path="extensions/new" element={<AdminExtensionFormPage />} />
            <Route path="extensions/:id/edit" element={<AdminExtensionFormPage />} />
            <Route path="guides" element={<AdminGuidesPage />} />
            <Route path="guides/new" element={<AdminGuideEditorPage />} />
            <Route path="guides/:id/edit" element={<AdminGuideEditorPage />} />
            <Route path="faqs" element={<AdminFAQsPage />} />
            <Route path="faqs/new" element={<AdminFAQEditorPage />} />
            <Route path="faqs/:id/edit" element={<AdminFAQEditorPage />} />
            <Route path="submissions" element={<AdminSubmissionsPage />} />
            <Route path="edit-suggestions" element={<AdminEditSuggestionsPage />} />
            <Route path="reports" element={<AdminReportsPage />} />
            <Route path="feedbacks" element={<AdminFeedbacksPage />} />
            <Route path="likes" element={<AdminLikesPage />} />
            <Route path="notices" element={<AdminNoticesPage />} />
            <Route path="donations" element={<AdminDonationsPage />} />
            <Route path="themes" element={<AdminThemesPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
            <Route path="logs" element={<AdminLogsPage />} />
            <Route path="sessions" element={<AdminSessionsPage />} />
            <Route path="admins" element={<ProtectedRoute requireSuperAdmin><AdminUsersPage /></ProtectedRoute>} />
          </Route>
        </Routes>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-page)] font-['Inter',sans-serif] flex flex-col">
      {/* <ChristmasSnow /> */}
      <Toaster position="top-center" />

      <Navbar
        onNavigate={handleNavigate}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      {/* Main Content */}
      <main className="flex-1 px-4 sm:px-8 lg:px-[120px] pt-24 pb-[calc(4rem+2rem+env(safe-area-inset-bottom))] md:pb-12">
        <NoticeBanner />
        <QuotaRibbon />
        <Routes>
          <Route
            path="/"
            element={<HomePage onNavigate={handleNavigate} />}
          />
          <Route
            path="/software"
            element={
              <SoftwarePage onNavigate={handleNavigate} />
            }
          />
          <Route
            path="/software/:appId"
            element={
              <AppDetailPageWrapper
                onNavigate={handleNavigate}
              />
            }
          />
          <Route
            path="/extensions"
            element={
              <ExtensionsPage onNavigate={handleNavigate} />
            }
          />
          <Route
            path="/extensions/:slug"
            element={
              <ExtensionDetailPageWrapper
                onNavigate={handleNavigate}
              />
            }
          />
          <Route
            path="/guides"
            element={<GuidesPage onNavigate={handleNavigate} />}
          />
          <Route
            path="/guides/:slug"
            element={
              <GuideDetailPageWrapper
                onNavigate={handleNavigate}
              />
            }
          />
          <Route
            path="/search"
            element={<SearchPage onNavigate={handleNavigate} />}
          />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contribute" element={<SubmitPage />} />
          <Route path="/donate" element={<DonatePage />} />

          {/* Fallback for unknown routes */}
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>

      <BottomNavigation
        onNavigate={handleNavigate}
        mobileMenuOpen={mobileMenuOpen}
        onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
      />

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default function App() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const storedTheme = localStorage.getItem("theme");
    const systemTheme = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches
      ? "dark"
      : "light";
    const initialTheme = storedTheme || systemTheme;

    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(initialTheme);
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <ThemeProvider>
      <BrowserRouter>
        <LikeProvider>
          <AppContent />
        </LikeProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}