-- PTR can mark a quarter as leave (O). That quarter drops out of the
-- annual goals average and is not scored as zero.

ALTER TABLE platform.review_packets
  ADD COLUMN IF NOT EXISTS leave_quarter BOOLEAN NOT NULL DEFAULT false;
