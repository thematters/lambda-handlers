
CREATE OR REPLACE FUNCTION notify_ipns_changes()
RETURNS trigger AS $$
BEGIN -- BEGIN
  PERFORM pg_notify(
    COALESCE(TG_ARGV[0], 'ipns_changed'), -- channel default to -- 'ipns_changed',
    json_build_object(
      'operation', TG_OP,
      'table_name', TG_TABLE_NAME,
      -- 'data_hash', row_to_json(NEW) ->'data_hash' -- coalesce(NEW.data_hash, NEW.last_data_hash),
      -- 'ipns_key', coalesce(NEW.ipns_key)
      'record', (
        SELECT jsonb_object_agg(key, value) FROM json_each(row_to_json(NEW))
        WHERE key IN (
          'id', 'slug', 'data_hash', -- article
          'id', 'ipns_key', 'last_data_hash' -- user_ipns_keys
        )
      )
    )::text
  );

  RETURN NEW;
  -- EXCEPTION WHEN OTHERS THEN -- Do nothing END;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ipns_changed ON user_ipns_keys ;
CREATE TRIGGER ipns_changed
AFTER UPDATE OF last_data_hash
ON user_ipns_keys
FOR EACH ROW
EXECUTE PROCEDURE notify_ipns_changes('ipns_changed');

DROP TRIGGER IF EXISTS ipns_changed ON article ;
CREATE TRIGGER ipns_changed
AFTER INSERT OR UPDATE
ON article
FOR EACH ROW
EXECUTE PROCEDURE notify_ipns_changes();

