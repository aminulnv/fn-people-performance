-- Core division for executive accounts (e.g. Jayed, Galib).

INSERT INTO platform.divisions (name)
VALUES ('Core')
ON CONFLICT (name) DO NOTHING;
