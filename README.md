# NSUPURE Field App

An installable, mobile-first field app for production, loading, orders and credit records.

## Safe offline workflow

Every change saves on the device before any network request. Production records can be corrected, removed from active totals with a reason, and restored later. Legacy records in `localStorage` are migrated in place; no automatic reset or deletion occurs.

The app keeps a local synchronization queue. When a staff member connects the device and signs in, queued changes are uploaded to the NSUPURE System API. Retried uploads are deduplicated using a device and event identifier. A failed network request leaves the local record and queued event intact.

## Server requirement

Online synchronization requires the paired `NSUPURE-SYSTEM` branch `improvement/mobile-offline-sync`. Deploy its additive `MobileSyncEvent` schema before connecting any device. Set `CORS_ORIGINS` to the field app's exact HTTPS address if the app is hosted separately, or serve this app from the same NSUPURE service.

The connection screen asks for the system address and a normal NSUPURE user account. Its access token is held in the browser session only; the field app does not store the password. Do not connect to an untrusted server address.

## Release gates

1. Take and restore-verify the existing business database backup.
2. Deploy the server schema and API to staging.
3. Connect one test device, create a record offline, reconnect and confirm it appears on a second test device.
4. Confirm active totals, removed records and audit history before enabling staff access.

This repository intentionally does not contain live data, credentials or backups.
