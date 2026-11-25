-- Apply only to the dedicated V2J database.
CREATE TABLE IF NOT EXISTS public.v2j_state (
 namespace text NOT NULL, key text NOT NULL, value jsonb NOT NULL,
 revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
 updated_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz,
 PRIMARY KEY (namespace,key)
);
