-- Disable maintenance mode in system_settings
UPDATE system_settings
SET value = jsonb_set(value, '{enabled}', 'false')
WHERE key = 'maintenance_mode';
