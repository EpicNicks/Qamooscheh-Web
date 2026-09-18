import type { UpdatePrefsRequest } from "../../types/api";

/** What every settings section needs from the shared form state SettingsPage owns — see its own header comment for why seeding/editing stays centralized there rather than per-section. */
export interface SettingsSectionProps {
  form: UpdatePrefsRequest;
  editForm: (patch: Partial<UpdatePrefsRequest>) => void;
  courseCode: string | null;
}
