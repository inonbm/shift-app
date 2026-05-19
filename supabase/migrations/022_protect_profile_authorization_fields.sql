-- Migration: 022_protect_profile_authorization_fields.sql
-- Description: Prevent client sessions from changing authorization-sensitive profile fields.

CREATE OR REPLACE FUNCTION public.prevent_profile_authorization_field_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Server-side admin/service-role workflows are allowed to manage these fields.
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Client sessions may edit safe profile fields, but authorization-sensitive
  -- fields must be immutable outside service-role Edge Functions. This prevents
  -- trainees from promoting themselves and prevents trainers from promoting or
  -- reassigning trainees through direct client-side profile updates.
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Only service role can change profile role';
  END IF;

  IF NEW.trainer_id IS DISTINCT FROM OLD.trainer_id THEN
    RAISE EXCEPTION 'Only service role can change trainer assignment';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

DROP TRIGGER IF EXISTS prevent_profile_authorization_field_changes ON public.profiles;
CREATE TRIGGER prevent_profile_authorization_field_changes
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_authorization_field_changes();
