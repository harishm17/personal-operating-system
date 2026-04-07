create unique index if not exists captures_client_request_id_unique
  on captures (client_request_id);

create unique index if not exists inbox_items_capture_id_item_type_unique
  on inbox_items (capture_id, item_type);

create unique index if not exists capture_sessions_capture_id_session_key_unique
  on capture_sessions (capture_id, session_key);

create unique index if not exists capture_events_capture_id_kind_unique
  on capture_events (capture_id, kind);
