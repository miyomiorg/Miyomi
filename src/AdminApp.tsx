import { Routes, Route } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import { AdminLayout } from './components/admin/AdminLayout';
import { ProtectedRoute } from './components/admin/ProtectedRoute';
import { lazyPage } from './lib/lazyPage';

/**
 * Admin area — loaded as a separate chunk so public visitors never download
 * it. Each page is its own chunk too (the rich-text editor, charts and QR
 * code libraries only load on the pages that use them).
 */
const AdminLoginPage = lazyPage(() => import('./pages/admin/AdminLoginPage'), 'AdminLoginPage');
const AdminDashboardPage = lazyPage(() => import('./pages/admin/AdminDashboardPage'), 'AdminDashboardPage');
const AdminAnalyticsPage = lazyPage(() => import('./pages/admin/AdminAnalyticsPage'), 'AdminAnalyticsPage');
const AdminAppsPage = lazyPage(() => import('./pages/admin/AdminAppsPage'), 'AdminAppsPage');
const AdminAppFormPage = lazyPage(() => import('./pages/admin/AdminAppFormPage'), 'AdminAppFormPage');
const AdminExtensionsPage = lazyPage(() => import('./pages/admin/AdminExtensionsPage'), 'AdminExtensionsPage');
const AdminExtensionFormPage = lazyPage(() => import('./pages/admin/AdminExtensionFormPage'), 'AdminExtensionFormPage');
const AdminGuidesPage = lazyPage(() => import('./pages/admin/AdminGuidesPage'), 'AdminGuidesPage');
const AdminGuideEditorPage = lazyPage(() => import('./pages/admin/AdminGuideEditorPage'), 'AdminGuideEditorPage');
const AdminFAQsPage = lazyPage(() => import('./pages/admin/AdminFAQsPage'), 'AdminFAQsPage');
const AdminFAQEditorPage = lazyPage(() => import('./pages/admin/AdminFAQEditorPage'), 'AdminFAQEditorPage');
const AdminBlogPostsPage = lazyPage(() => import('./pages/admin/AdminBlogPostsPage'), 'AdminBlogPostsPage');
const AdminBlogPostEditorPage = lazyPage(() => import('./pages/admin/AdminBlogPostEditorPage'), 'AdminBlogPostEditorPage');
const AdminSubmissionsPage = lazyPage(() => import('./pages/admin/AdminSubmissionsPage'), 'AdminSubmissionsPage');
const AdminGuideSubmissionsPage = lazyPage(() => import('./pages/admin/AdminGuideSubmissionsPage'), 'AdminGuideSubmissionsPage');
const AdminLikesPage = lazyPage(() => import('./pages/admin/AdminLikesPage'), 'AdminLikesPage');
const AdminNoticesPage = lazyPage(() => import('./pages/admin/AdminNoticesPage'), 'AdminNoticesPage');
const AdminDonationsPage = lazyPage(() => import('./pages/admin/AdminDonationsPage'), 'AdminDonationsPage');
const AdminThemesPage = lazyPage(() => import('./pages/admin/AdminThemesPage'), 'AdminThemesPage');
const AdminSettingsPage = lazyPage(() => import('./pages/admin/AdminSettingsPage'), 'AdminSettingsPage');
const AdminLogsPage = lazyPage(() => import('./pages/admin/AdminLogsPage'), 'AdminLogsPage');
const AdminBotLogsPage = lazyPage(() => import('./pages/admin/AdminBotLogsPage'), 'AdminBotLogsPage');
const AdminUsersPage = lazyPage(() => import('./pages/admin/AdminUsersPage'), 'AdminUsersPage');
const AdminContributorsPage = lazyPage(() => import('./pages/admin/AdminContributorsPage'), 'AdminContributorsPage');
const AdminEditSuggestionsPage = lazyPage(() => import('./pages/admin/AdminEditSuggestionsPage'), 'AdminEditSuggestionsPage');
const AdminReviewPage = lazyPage(() => import('./pages/admin/AdminReviewPage'), 'AdminReviewPage');
const AdminReportsPage = lazyPage(() => import('./pages/admin/AdminReportsPage'), 'AdminReportsPage');
const AdminFeedbacksPage = lazyPage(() => import('./pages/admin/AdminFeedbacksPage'), 'AdminFeedbacksPage');
const AdminCompatGroupsPage = lazyPage(() => import('./pages/admin/AdminCompatGroupsPage'), 'AdminCompatGroupsPage');

export default function AdminApp() {
  return (
    <>
      <Toaster position="top-center" />
      <Routes>
        <Route path="/admin" element={<AdminLoginPage />} />
        <Route path="/admin/*" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="analytics" element={<AdminAnalyticsPage />} />
          <Route path="apps" element={<AdminAppsPage />} />
          <Route path="apps/new" element={<AdminAppFormPage />} />
          <Route path="apps/:id/edit" element={<AdminAppFormPage />} />
          <Route path="extensions" element={<AdminExtensionsPage />} />
          <Route path="extensions/new" element={<AdminExtensionFormPage />} />
          <Route path="extensions/:id/edit" element={<AdminExtensionFormPage />} />
          <Route path="guides" element={<AdminGuidesPage />} />
          <Route path="guides/new" element={<AdminGuideEditorPage />} />
          <Route path="guides/:id/edit" element={<AdminGuideEditorPage />} />
          <Route path="blog-posts" element={<AdminBlogPostsPage />} />
          <Route path="blog-posts/new" element={<AdminBlogPostEditorPage />} />
          <Route path="blog-posts/:id/edit" element={<AdminBlogPostEditorPage />} />
          <Route path="faqs" element={<AdminFAQsPage />} />
          <Route path="faqs/new" element={<AdminFAQEditorPage />} />
          <Route path="faqs/:id/edit" element={<AdminFAQEditorPage />} />
          <Route path="contributors" element={<AdminContributorsPage />} />
          <Route path="submissions" element={<AdminSubmissionsPage />} />
          <Route path="guide-submissions" element={<AdminGuideSubmissionsPage />} />
          <Route path="submissions/:id" element={<AdminReviewPage mode="submission" />} />
          <Route path="edit-suggestions" element={<AdminEditSuggestionsPage />} />
          <Route path="edit-suggestions/:id" element={<AdminReviewPage mode="edit-suggestion" />} />
          <Route path="reports" element={<AdminReportsPage />} />
          <Route path="feedbacks" element={<AdminFeedbacksPage />} />
          <Route path="likes" element={<AdminLikesPage />} />
          <Route path="compat-groups" element={<AdminCompatGroupsPage />} />
          <Route path="notices" element={<AdminNoticesPage />} />
          <Route path="donations" element={<AdminDonationsPage />} />
          <Route path="themes" element={<AdminThemesPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
          <Route path="logs" element={<AdminLogsPage />} />
          <Route path="bot-logs" element={<AdminBotLogsPage />} />
          <Route path="admins" element={<ProtectedRoute requireSuperAdmin><AdminUsersPage /></ProtectedRoute>} />
        </Route>
      </Routes>
    </>
  );
}
