-- Canonicalize existing model selections from raw model IDs to provider:model IDs.
UPDATE "UserPreferences"
SET "lastModel" = CASE
    WHEN "lastModel" IN ('gpt-5.2', 'gpt-5.1-codex') THEN 'openai:' || "lastModel"
    WHEN "lastModel" IS NOT NULL AND POSITION(':' IN "lastModel") = 0 THEN 'anthropic:' || "lastModel"
    ELSE "lastModel"
END
WHERE "lastModel" IS NOT NULL;

UPDATE "Session"
SET "model" = CASE
    WHEN "model" IN ('gpt-5.2', 'gpt-5.1-codex') THEN 'openai:' || "model"
    WHEN POSITION(':' IN "model") = 0 THEN 'anthropic:' || "model"
    ELSE "model"
END;
