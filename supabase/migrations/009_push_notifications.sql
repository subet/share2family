-- 009_push_notifications.sql
-- Push-notification fan-out via queue + pg_cron.
-- Triggers enqueue events; a cron worker processes the queue and POSTs to the
-- Edge Function `notify-family`, which talks to Expo's push API.

-- ============================================================
-- 1. Extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- ============================================================
-- 2. Profiles: notifications opt-in + locale (locale used in v2)
-- ============================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS notifications_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS locale text;

-- ============================================================
-- 3. Devices: allow multiple tokens per user (iPad + iPhone, etc.)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'devices_user_token_key'
  ) THEN
    ALTER TABLE devices
      ADD CONSTRAINT devices_user_token_key UNIQUE (user_id, push_token);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_devices_user_token
  ON devices (user_id, push_token);

-- ============================================================
-- 4. Notification queue
-- One row per pending push. Item-add events coalesce into a single row
-- per (family_id, list_id) via the partial unique index below.
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_queue (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id uuid NOT NULL REFERENCES families ON DELETE CASCADE,
  actor_id uuid REFERENCES profiles ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('list_created', 'item_added', 'list_completed')),
  list_id uuid REFERENCES notes ON DELETE CASCADE,
  list_title text,
  added_count integer NOT NULL DEFAULT 1,
  coalesce_until timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_queue_due
  ON notification_queue (coalesce_until);

-- Coalesce repeated item_added events for the same list into one row.
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_queue_dedup_item_added
  ON notification_queue (family_id, list_id)
  WHERE event_type = 'item_added';

-- ============================================================
-- 5. Helper: enqueue a notification event
-- ============================================================
CREATE OR REPLACE FUNCTION enqueue_family_push(
  p_family_id uuid,
  p_actor_id uuid,
  p_event_type text,
  p_list_id uuid,
  p_list_title text,
  p_delay_seconds integer DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_premium boolean;
  v_due timestamptz := now() + make_interval(secs => p_delay_seconds);
BEGIN
  -- Premium gate: only paid families get pushes
  SELECT is_premium INTO v_is_premium FROM families WHERE id = p_family_id;
  IF v_is_premium IS DISTINCT FROM true THEN
    RETURN;
  END IF;

  IF p_event_type = 'item_added' THEN
    -- Coalesce: bump existing row's timer + counter
    INSERT INTO notification_queue (family_id, actor_id, event_type, list_id, list_title, coalesce_until, added_count)
    VALUES (p_family_id, p_actor_id, 'item_added', p_list_id, p_list_title, v_due, 1)
    ON CONFLICT (family_id, list_id) WHERE event_type = 'item_added'
    DO UPDATE SET
      coalesce_until = GREATEST(notification_queue.coalesce_until, excluded.coalesce_until),
      added_count = notification_queue.added_count + 1,
      actor_id = excluded.actor_id,
      list_title = excluded.list_title;
  ELSE
    INSERT INTO notification_queue (family_id, actor_id, event_type, list_id, list_title, coalesce_until)
    VALUES (p_family_id, p_actor_id, p_event_type, p_list_id, p_list_title, v_due);
  END IF;
END;
$$;

-- ============================================================
-- 6. Trigger: list created
-- ============================================================
CREATE OR REPLACE FUNCTION trg_notify_list_created()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.archived_at IS NULL THEN
    PERFORM enqueue_family_push(NEW.family_id, NEW.created_by, 'list_created', NEW.id, NEW.title, 0);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_list_created ON notes;
CREATE TRIGGER trg_notify_list_created
  AFTER INSERT ON notes
  FOR EACH ROW EXECUTE FUNCTION trg_notify_list_created();

-- ============================================================
-- 7. Trigger: item added (scaffolded — disabled by default for v1)
-- Set notification_settings.item_added_enabled = true to turn on.
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_settings (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  item_added_enabled boolean NOT NULL DEFAULT false,
  item_added_delay_seconds integer NOT NULL DEFAULT 60
);
INSERT INTO notification_settings (singleton) VALUES (true) ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION trg_notify_item_added()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_enabled boolean;
  v_delay integer;
  v_note record;
BEGIN
  SELECT item_added_enabled, item_added_delay_seconds
    INTO v_enabled, v_delay
    FROM notification_settings WHERE singleton = true;

  IF v_enabled IS DISTINCT FROM true THEN
    RETURN NEW;
  END IF;

  SELECT family_id, title INTO v_note FROM notes WHERE id = NEW.note_id;
  IF v_note.family_id IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM enqueue_family_push(v_note.family_id, NEW.created_by, 'item_added', NEW.note_id, v_note.title, v_delay);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_item_added ON checklist_items;
CREATE TRIGGER trg_notify_item_added
  AFTER INSERT ON checklist_items
  FOR EACH ROW EXECUTE FUNCTION trg_notify_item_added();

-- ============================================================
-- 8. Trigger: list completed (all items done)
-- Fires when an item flips to completed AND no remaining items are unchecked.
-- ============================================================
CREATE OR REPLACE FUNCTION trg_notify_list_completed()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_remaining integer;
  v_note record;
BEGIN
  IF NEW.is_completed = false OR OLD.is_completed = true THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO v_remaining
    FROM checklist_items
    WHERE note_id = NEW.note_id AND is_completed = false;

  IF v_remaining > 0 THEN
    RETURN NEW;
  END IF;

  SELECT family_id, title INTO v_note FROM notes WHERE id = NEW.note_id;
  IF v_note.family_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Use coalesce_until throttling via the dedup index? No — list_completed
  -- isn't deduped. To prevent loops (uncheck/recheck), the cron worker also
  -- skips if a list_completed for the same list fired in the last 5 minutes.
  PERFORM enqueue_family_push(v_note.family_id, NEW.created_by, 'list_completed', NEW.note_id, v_note.title, 0);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_list_completed ON checklist_items;
CREATE TRIGGER trg_notify_list_completed
  AFTER UPDATE OF is_completed ON checklist_items
  FOR EACH ROW EXECUTE FUNCTION trg_notify_list_completed();

-- Track recent list_completed sends to suppress duplicates within 5 minutes.
CREATE TABLE IF NOT EXISTS notification_recent_completed (
  list_id uuid PRIMARY KEY REFERENCES notes ON DELETE CASCADE,
  last_sent_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 9. Cron worker: drains the queue and POSTs to the Edge Function
-- ============================================================
CREATE OR REPLACE FUNCTION process_notification_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_row record;
  v_url text := 'https://lbzgkpxyyrvsrzfvgjnb.functions.supabase.co/notify-family';
  v_secret text;
  v_recent timestamptz;
BEGIN
  SELECT decrypted_secret INTO v_secret
    FROM vault.decrypted_secrets
    WHERE name = 'notify_function_secret'
    LIMIT 1;

  IF v_secret IS NULL THEN
    RAISE WARNING 'notify_function_secret missing from vault; skipping queue';
    RETURN;
  END IF;

  FOR v_row IN
    SELECT * FROM notification_queue
    WHERE coalesce_until <= now()
    ORDER BY created_at
    LIMIT 100
    FOR UPDATE SKIP LOCKED
  LOOP
    -- Anti-loop guard for list_completed: skip if we just sent one for this list
    IF v_row.event_type = 'list_completed' THEN
      SELECT last_sent_at INTO v_recent
        FROM notification_recent_completed
        WHERE list_id = v_row.list_id;
      IF v_recent IS NOT NULL AND v_recent > now() - interval '5 minutes' THEN
        DELETE FROM notification_queue WHERE id = v_row.id;
        CONTINUE;
      END IF;
      INSERT INTO notification_recent_completed (list_id, last_sent_at)
      VALUES (v_row.list_id, now())
      ON CONFLICT (list_id) DO UPDATE SET last_sent_at = now();
    END IF;

    PERFORM net.http_post(
      url := v_url,
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || v_secret,
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'family_id', v_row.family_id,
        'actor_id', v_row.actor_id,
        'event_type', v_row.event_type,
        'list_id', v_row.list_id,
        'list_title', v_row.list_title,
        'added_count', v_row.added_count
      )
    );

    DELETE FROM notification_queue WHERE id = v_row.id;
  END LOOP;
END;
$$;

-- Schedule every minute (Supabase pg_cron minimum granularity).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'process-notification-queue'
  ) THEN
    PERFORM cron.schedule(
      'process-notification-queue',
      '* * * * *',
      $cron$ SELECT process_notification_queue(); $cron$
    );
  END IF;
END $$;
