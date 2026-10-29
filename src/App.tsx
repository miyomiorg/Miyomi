import React, { Suspense, useCallback, useEffect, useState } from "react";
import { Toaster } from "./components/ui/sonner";
import { ThemeProvider } from "./components/ThemeProvider";
import { LikeProvider } from "./context/LikeContext";
import { Navbar } from "./components/Navbar";
import { BottomNavigation } from "./components/BottomNavigation";
import { Footer } from "./components/Footer";
import { NoticeBanner } from "./components/NoticeBanner";
import { QuotaRibbon } from "./components/QuotaRibbon";
import { HomePage } from "./pages/HomePage";
import { lazyPage, prefetchWhenIdle } from "./lib/lazyPage";
import { LazyMotion } from "motion/react";
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  useParams,
  useLocation,
} from "react-router-dom";

// The home page ships in the main bundle for the fastest first paint; every
// other page is its own chunk, fetched on navigation (or prefetched on idle).
const loadSoftware = () => import("./pages/SoftwarePage");
const loadExtensions = () => import("./pages/ExtensionsPage");
const loadGuides = () => import("./pages/GuidesPage");
const loadAppDetail = () => import("./pages/AppDetailPage");
const loadExtensionDetail = () => import("./pages/ExtensionDetailPage");

const SoftwarePage = lazyPage(loadSoftware, "SoftwarePage");
const ExtensionsPage = lazyPage(loadExtensions, "ExtensionsPage");
const GuidesPage = lazyPage(loadGuides, "GuidesPage");
const AppDetailPage = lazyPage(loadAppDetail, "AppDetailPage");
const ExtensionDetailPage = lazyPage(loadExtensionDetail, "ExtensionDetailPage");
const GuideDetailPage = lazyPage(() => import("./pages/GuideDetailPage"), "GuideDetailPage");
const FAQPage = lazyPage(() => import("./pages/FAQPage"), "FAQPage");
const AboutPage = lazyPage(() => import("./pages/AboutPage"), "AboutPage");
const BlogPage = lazyPage(() => import("./pages/BlogPage"), "BlogPage");
const BlogDetailPage = lazyPage(() => import("./pages/BlogDetailPage"), "BlogDetailPage");
const NotFoundPage = lazyPage(() => import("./pages/NotFoundPage"), "NotFoundPage");
const SearchPage = lazyPage(() => import("./pages/SearchPage"), "SearchPage");
const DonatePage = lazyPage(() => import("./pages/DonatePage"), "DonatePage");
const SubmitPage = lazyPage(() => import("./pages/SubmitPage"), "SubmitPage");
const SubmitGuidePage = lazyPage(() => import("./pages/SubmitGuidePage"), "SubmitGuidePage");
const UnauthorizedPage = lazyPage(() => import("./pages/UnauthorizedPage"), "UnauthorizedPage");
const PrivacyPolicyPage = lazyPage(() => import("./pages/PrivacyPolicyPage"), "PrivacyPolicyPage");

// The whole admin area (layout + pages) is a separate chunk.
const AdminApp = React.lazy(() => import("./AdminApp"));

function PageFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="Loading">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--divider)] border-t-[var(--brand)]" />
    </div>
  );
}

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

function PublicApp() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Warm the most-visited pages once the first page is interactive.
  useEffect(() => {
    prefetchWhenIdle([loadSoftware, loadExtensions, loadGuides, loadAppDetail, loadExtensionDetail]);
  }, []);

  const handleNavigate = useCallback((path: string) => {
    const currentScrollY = window.scrollY;
    React.startTransition(() => {
      navigate(path, {
        state: {
          previousScrollPosition: currentScrollY,
          fromNavigation: true
        }
      });
      // Scroll to top for new pages
      window.scrollTo({ top: 0, behavior: 'instant' });
    });
  }, [navigate]);

  const toggleMobileMenu = useCallback(() => setMobileMenuOpen((open) => !open), []);

  return (
    <LikeProvider>
      <div className="min-h-dvh bg-[var(--bg-page)] font-['Inter',sans-serif] flex flex-col">
        <Toaster position="top-center" />

        <Navbar
          onNavigate={handleNavigate}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
        />

        {/* Main Content */}
        <main className="flex-1 px-4 sm:px-8 lg:px-[120px] pt-[calc(4rem+env(safe-area-inset-top))] md:pt-24 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-12">
          <NoticeBanner />
          <QuotaRibbon />
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<HomePage onNavigate={handleNavigate} />} />
              <Route path="/software" element={<SoftwarePage onNavigate={handleNavigate} />} />
              <Route path="/software/:appId" element={<AppDetailPageWrapper onNavigate={handleNavigate} />} />
              <Route path="/extensions" element={<ExtensionsPage onNavigate={handleNavigate} />} />
              <Route path="/extensions/:slug" element={<ExtensionDetailPageWrapper onNavigate={handleNavigate} />} />
              <Route path="/guides" element={<GuidesPage onNavigate={handleNavigate} />} />
              <Route path="/guides/:slug" element={<GuideDetailPageWrapper onNavigate={handleNavigate} />} />
              <Route path="/blog" element={<BlogPage onNavigate={handleNavigate} />} />
              <Route path="/blog/:slug" element={<BlogDetailPage onNavigate={handleNavigate} />} />
              <Route path="/search" element={<SearchPage onNavigate={handleNavigate} />} />
              <Route path="/faq" element={<FAQPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
              <Route path="/contribute" element={<SubmitPage />} />
              <Route path="/donate" element={<DonatePage />} />
              <Route path="/submit-guide" element={<SubmitGuidePage onNavigate={handleNavigate} />} />

              {/* Fallback for unknown routes */}
              <Route path="/unauthorized" element={<UnauthorizedPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </main>

        <BottomNavigation
          onNavigate={handleNavigate}
          mobileMenuOpen={mobileMenuOpen}
          onMenuToggle={toggleMobileMenu}
        />

        {/* Footer */}
        <Footer />
      </div>
    </LikeProvider>
  );
}

function AppContent() {
  const location = useLocation();
  // Admin routes get their own layout (no Navbar/Footer) and their own chunk.
  if (location.pathname.startsWith('/admin')) {
    return (
      <Suspense fallback={<PageFallback />}>
        <AdminApp />
      </Suspense>
    );
  }
  return <PublicApp />;
}

// Components import `m` (aliased as `motion`); the animation engine itself
// arrives in a separate chunk after first paint.
const loadMotionFeatures = () => import("./lib/motionFeatures").then((mod) => mod.default);

export default function App() {
  return (
    <ThemeProvider>
      <LazyMotion features={loadMotionFeatures} strict>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </LazyMotion>
    </ThemeProvider>
  );
}
