ALTER TABLE subscriptions ADD COLUMN amount_mode TEXT NOT NULL DEFAULT 'fixed'
    CHECK(amount_mode IN ('fixed', 'variable'));
ALTER TABLE snapshot_items ADD COLUMN amount_mode TEXT NOT NULL DEFAULT 'fixed'
    CHECK(amount_mode IN ('fixed', 'variable'));
ALTER TABLE snapshot_items ADD COLUMN scheduled_date TEXT;
ALTER TABLE snapshot_items ADD COLUMN amount_overridden INTEGER NOT NULL DEFAULT 0;
ALTER TABLE snapshot_items ADD COLUMN date_overridden INTEGER NOT NULL DEFAULT 0;

UPDATE snapshot_items SET scheduled_date = occurrence_date;

-- Existing utility bills and card statements need a fresh amount each period.
-- Telecom and housing records retain their existing fixed-price behavior.
UPDATE subscriptions SET amount_mode = 'variable'
WHERE recurrence_type = 'recurring'
    AND (category = 'Utilities' OR (type = 'bill' AND category = 'Bills') OR type = 'credit_card');

UPDATE snapshot_items SET amount_mode = 'variable'
WHERE subscription_id IN (SELECT id FROM subscriptions WHERE amount_mode = 'variable');

-- Retain already visible current/historical prices. Future variable bills start blank.
UPDATE snapshot_items SET amount_overridden = 1
WHERE amount_mode = 'variable' AND amount IS NOT NULL
    AND (status IN ('done', 'skipped') OR snapshot_id IN (
        SELECT id FROM monthly_snapshots WHERE month <= strftime('%Y-%m', 'now', 'localtime')
    ));
UPDATE snapshot_items SET amount = NULL
WHERE amount_mode = 'variable' AND amount_overridden = 0;
UPDATE subscriptions SET amount = NULL WHERE amount_mode = 'variable';
