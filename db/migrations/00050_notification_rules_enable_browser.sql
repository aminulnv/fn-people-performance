-- Enable browser delivery on every notification rule that does not already have it.

UPDATE platform.notification_rules
SET
  channels = array_append(channels, 'browser'),
  updated_at = NOW()
WHERE NOT ('browser' = ANY (channels));
