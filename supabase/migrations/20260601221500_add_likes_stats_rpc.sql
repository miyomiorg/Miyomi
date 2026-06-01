CREATE OR REPLACE FUNCTION get_likes_stats()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'total', (SELECT count(*) FROM likes),
    'byType', COALESCE((
      SELECT json_object_agg(item_type, count)
      FROM (SELECT item_type, count(*) as count FROM likes WHERE item_type IS NOT NULL GROUP BY item_type) t
    ), '{}'::json),
    'byBrowser', COALESCE((
      SELECT json_object_agg(browser, count)
      FROM (SELECT browser, count(*) as count FROM likes WHERE browser IS NOT NULL GROUP BY browser ORDER BY count DESC LIMIT 5) t
    ), '{}'::json),
    'byOS', COALESCE((
      SELECT json_object_agg(os, count)
      FROM (SELECT os, count(*) as count FROM likes WHERE os IS NOT NULL GROUP BY os ORDER BY count DESC LIMIT 5) t
    ), '{}'::json),
    'byDeviceType', COALESCE((
      SELECT json_object_agg(device_type, count)
      FROM (SELECT device_type, count(*) as count FROM likes WHERE device_type IS NOT NULL GROUP BY device_type ORDER BY count DESC LIMIT 5) t
    ), '{}'::json)
  );
$$;
