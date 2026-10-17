-- ⚠️  SYNTHETIC LOCAL SEED — THIS WIPES EVERY TABLE
-- Use only when you do NOT have the migrated production backup and just
-- want a throwaway dataset to click around in. It DELETES all rows first.
--
--   npx wrangler d1 execute miyomi-db --local --file scripts/seed-synthetic.sql
--
-- To add the local dev admin WITHOUT wiping migrated data, use:
--   npm run seed:local
--
-- Login after this seed: admin@miyomi.local / MiomiLocal123!
-- (The password hash below is pbkdf2 for that password.)

-- Full reset (local dev only)
DELETE FROM app_group_memberships;
DELETE FROM extension_group_memberships;
DELETE FROM likes;
DELETE FROM rate_limits;
DELETE FROM admin_sessions;
DELETE FROM admin_logs;
DELETE FROM unauthorized_login_attempts;
DELETE FROM user_roles;
DELETE FROM moderator_permissions;
DELETE FROM contributors;
DELETE FROM public_edit_suggestions;
DELETE FROM submissions;
DELETE FROM reports;
DELETE FROM feedbacks;
DELETE FROM settings;
DELETE FROM donation_settings;
DELETE FROM donations;
DELETE FROM notices;
DELETE FROM bot_attack_logs;
DELETE FROM themes;
DELETE FROM faqs;
DELETE FROM compatibility_groups;
DELETE FROM guides;
DELETE FROM blog_posts;
DELETE FROM extensions;
DELETE FROM apps;
DELETE FROM admins;

INSERT INTO admins (id, email, password_hash, display_name, is_active, created_at, updated_at)
VALUES ('seed-admin-1', 'admin@miyomi.local', 'pbkdf2-sha256$210000$2iS4SBXGjS7rfYITD4rkog$abk1M3YDPSBDyq5Hv_5vYHlh8dwduFqQLikepUWoXMQ', 'Local Admin', 1, '2026-10-17T07:46:07.450Z', '2026-10-17T07:46:07.450Z');

INSERT INTO user_roles (id, user_id, role)
VALUES ('seed-role-1', 'seed-admin-1', 'super_admin');

INSERT INTO apps (id, name, slug, status, description, platforms, metadata, seo_title, seo_description, download_count, likes_count, created_at, updated_at)
VALUES ('seed-app-1', 'Miyomi Test App', 'test-app', 'approved',
        'A seeded app for local development.', '["android","web"]',
        '{"rating":4.8,"contentTypes":["manga"]}', 'Seeded App SEO Title', 'Seeded app description for SEO.',
        10, 0, '2026-10-17T07:46:07.450Z', '2026-10-17T07:46:07.450Z');

INSERT INTO extensions (id, name, slug, status, description, auto_url, metadata, created_at, updated_at)
VALUES ('seed-ext-1', 'Test Source', 'test-source', 'approved',
        'A seeded extension source for local development.',
        'https://example.com/source.json',
        '{"types":["manga"]}', '2026-10-17T07:46:07.450Z', '2026-10-17T07:46:07.450Z');

INSERT INTO guides (id, title, slug, status, category, description, content, content_format, author, created_at, updated_at)
VALUES ('seed-guide-1', 'Getting Started Guide', 'getting-started', 'published',
        'Basics', 'How to get started.', 'Welcome to the seeded guide.', 'markdown',
        'Local Dev', '2026-10-17T07:46:07.450Z', '2026-10-17T07:46:07.450Z');

INSERT INTO blog_posts (id, title, slug, status, category, content, content_format, author_name, published_at, views, created_at, updated_at)
VALUES ('seed-blog-1', 'Hello Blog', 'hello-blog', 'published',
        'Announcements', 'This is a seeded blog post.', 'markdown',
        'Miyomi Admin', '2026-10-17T07:46:07.450Z', 3, '2026-10-17T07:46:07.450Z', '2026-10-17T07:46:07.450Z');

INSERT INTO faqs (id, question, answer, category, order_index, created_at, updated_at)
VALUES ('seed-faq-1', 'What is Miyomi?', 'A community directory for apps and extensions.', 'general', 1, '2026-10-17T07:46:07.450Z', '2026-10-17T07:46:07.450Z');

INSERT INTO settings (id, key, value, is_sensitive, updated_at)
VALUES ('seed-set-1', 'reports_enabled', 'true', 0, '2026-10-17T07:46:07.450Z'),
       ('seed-set-2', 'feedback_enabled', 'true', 0, '2026-10-17T07:46:07.450Z'),
       ('seed-set-3', 'telegram_token', 'secret', 1, '2026-10-17T07:46:07.450Z');

INSERT INTO donations (id, donor_name, message, is_public, show_amount, amount, currency, payment_method, created_at, updated_at)
VALUES ('seed-don-1', 'Local Dev', 'Thanks for the great directory!', 1, 1, 5.0, 'USD', 'paypal', '2026-10-17T07:46:07.450Z', '2026-10-17T07:46:07.450Z');

INSERT INTO compatibility_groups (id, name, description, color, created_at, updated_at)
VALUES ('seed-group-1', 'Mihon Family', 'Ecosystem for Mihon', '#EAB308', '2026-10-17T07:46:07.450Z', '2026-10-17T07:46:07.450Z');

INSERT INTO app_group_memberships (app_id, group_id) VALUES ('seed-app-1', 'seed-group-1');
INSERT INTO extension_group_memberships (extension_id, group_id) VALUES ('seed-ext-1', 'seed-group-1');

INSERT INTO contributors (id, name, contributions, created_at, updated_at)
VALUES ('seed-contrib-1', 'Local Dev', '[{"type":"app","id":"seed-app-1","name":"Miyomi Test App"}]', '2026-10-17T07:46:07.450Z', '2026-10-17T07:46:07.450Z');
