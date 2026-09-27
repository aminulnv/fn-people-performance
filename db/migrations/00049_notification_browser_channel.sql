-- Add browser (OS / Web Notification API) as a delivery channel.

ALTER TABLE platform.notification_deliveries
  DROP CONSTRAINT IF EXISTS notification_deliveries_channel_check;

ALTER TABLE platform.notification_deliveries
  ADD CONSTRAINT notification_deliveries_channel_check
  CHECK (channel IN ('in_app', 'email', 'clickup', 'browser'));

ALTER TABLE platform.notification_rules
  DROP CONSTRAINT IF EXISTS notification_rules_channels_check;

ALTER TABLE platform.notification_rules
  ADD CONSTRAINT notification_rules_channels_check
  CHECK (
    cardinality(channels) > 0
    AND channels <@ ARRAY['in_app', 'email', 'clickup', 'browser']::text[]
  );
