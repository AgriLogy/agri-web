/**
 * Shared shape of a notification payload.
 *
 * The per-notification card that used to live here (a large weather / soil /
 * irrigation panel) was replaced by the compact list row + reusable detail
 * (`NotificationListItem` → `NotificationDetailFrench`, agri-web #107). Only the
 * payload contract remains, imported by the list, the detail view and the
 * navbar bell popover.
 */
export interface NotificationPayload {
  yesterday_temperature: string;
  today_temperature: string;
  yesterday_humidity: string;
  today_humidity: string;
  ET0: string;
  soil_humidity: string;
  soil_temperature: string;
  soil_ph: string;
  perfect_irrigation_period: string;
  last_irrigation_date: string;
  last_start_irrigation_hour: string;
  last_finish_irrigation_hour: string;
  used_water_irrigation: string;
  notification_date: string;
  /** When present (API), binds this row to stored zone notification config & bell counts. */
  zone_id?: number;
  zone_name?: string;
  /** Binds this row to one stored notification configuration (secteur). */
  notification_config_id?: string;
  /** Optional API field to disambiguate when several configs share a zone. */
  notification_name?: string;
  /** Local confirmation row after saving zone notification config. */
  template_summary?: string;
}
