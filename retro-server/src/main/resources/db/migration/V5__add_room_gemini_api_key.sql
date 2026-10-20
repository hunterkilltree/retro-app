-- Optional Gemini API key supplied by the host at room creation.
-- Enables AI group-title suggestions for this room; never returned to clients.
ALTER TABLE rooms ADD COLUMN gemini_api_key VARCHAR(200);
