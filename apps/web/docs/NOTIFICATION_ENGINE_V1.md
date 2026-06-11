# Notification decision engine — v1

This document describes the **first version** of the client-side notification decision logic used in Agrilogy. It is meant to stay stable for UI and local configuration while the backend evolves.

## Inputs

| Input             | Source (v1)                                                                  | Notes                                                                                                          |
| ----------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **ET0**           | Notification payload field `ET0` (string, may include units)                 | Parsed numerically as mm.                                                                                      |
| **Soil humidity** | `soil_humidity` from the same payload                                        | Parsed as percentage.                                                                                          |
| **Kc**            | Zone notification configuration (`kc`) in browser storage, keyed by `zoneId` | Falls back to **1.0** if there is no config or no `zone_id` on the notification.                               |
| **Thresholds**    | Same configuration: `criticalThresholdPct`, `et0KcAdvisoryMm`                | Fallback defaults: humidity **20%**, ET0×Kc advisory **4 mm** (see `DEFAULT_NOTIFICATION_THRESHOLDS` in code). |

## Derived value

- **ET0×Kc** (mm): product of parsed ET0 and Kc. Used as a proxy for **crop water demand** relative to reference evapotranspiration.

## Rules (evaluation order)

1. **R0 — Invalid input**  
   If ET0, soil humidity, or Kc is not finite → **advisory** (cannot classify safely).  
   _Upgrade path: use last good reading or server-side validation._

2. **R1 — Humidity at or below critical threshold**  
   If `soil_humidity <= criticalThresholdPct` → **critical**  
   _Meaning: soil moisture is in the stress/irrigation-alert band._

3. **R2 — High ET0×Kc**  
   Else if `ET0×Kc >= et0KcAdvisoryMm` → **advisory**  
   _Meaning: elevated atmospheric/crop demand; monitor or prepare irrigation._

4. **R3 — Nominal**  
   Else → **ok**

## Decision outputs

- **ok** — Within configured bounds.
- **advisory** — Attention warranted (demand and/or data quality).
- **critical** — Humidity threshold breached; primary irrigation notification path.

## Debugging

- Each evaluation appends human-readable lines to a **`logs`** array and returns **`rulesFired`** (e.g. `R1_humidity_at_or_below_critical`).
- The UI calls `logDecisionToConsole()` so lines appear in the browser devtools console prefixed with `[notification-engine]`.

## Configuration storage

- Per-zone settings (including thresholds, Kc, and contact channels) are stored under  
  `localStorage` key **`agrilogy_zone_notification_configs_v1`**.
- **Future upgrade:** replace or mirror this with `PUT/GET` on the API per zone.

## Outbound email / SMS / WhatsApp

- `dispatchZoneNotificationOutbound()` **always logs** the payload to the console.
- It **optionally** `POST`s to `/api/zone-notification-outbound/` when the backend implements it.
- v1 does not ship SMTP or Twilio keys; delivery is expected to be implemented server-side.

## Backend alignment

For per-zone navbar badges and cleaner attribution, notification payloads should include:

- `zone_id` (number)
- optionally `zone_name` (string)

These fields are optional in the client types so older APIs keep working.
