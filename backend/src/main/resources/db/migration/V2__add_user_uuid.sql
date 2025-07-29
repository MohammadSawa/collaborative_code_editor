-- Add UUID column to user_entity table
ALTER TABLE user_entity
ADD COLUMN uuid VARCHAR(36) DEFAULT NULL;

-- Set a unique constraint on the UUID column
ALTER TABLE user_entity
ADD UNIQUE INDEX idx_user_uuid (uuid);

-- Update existing users with a generated UUID
UPDATE user_entity
SET uuid = UUID()
WHERE uuid IS NULL;

-- Make UUID NOT NULL after ensuring all records have a UUID
ALTER TABLE user_entity
MODIFY COLUMN uuid VARCHAR(36) NOT NULL; 