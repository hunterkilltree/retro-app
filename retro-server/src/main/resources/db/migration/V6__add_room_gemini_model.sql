-- Optional Gemini model chosen by the host at room creation (null = server default).
ALTER TABLE rooms ADD COLUMN gemini_model VARCHAR(80);
