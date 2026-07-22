/**
 * Unit tests for the notification-zones update broadcast (agri-web #62).
 *
 * The manager page emits this event after create/update/delete so an open zone
 * picker refetches instead of showing a stale list. The event NAME is part of
 * the contract (listener and emitter live in different components), hence the
 * literal assertion.
 */

import {
  NOTIFICATION_ZONES_UPDATED_EVENT,
  emitNotificationZonesUpdated,
} from '@agri/api-client/notificationZoneApi';

describe('emitNotificationZonesUpdated', () => {
  it('exports a stable event name', () => {
    expect(NOTIFICATION_ZONES_UPDATED_EVENT).toBe(
      'agrilogy-notification-zones-updated'
    );
  });

  it('dispatches the event on window', () => {
    const listener = jest.fn();
    window.addEventListener(NOTIFICATION_ZONES_UPDATED_EVENT, listener);
    emitNotificationZonesUpdated();
    window.removeEventListener(NOTIFICATION_ZONES_UPDATED_EVENT, listener);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].type).toBe(
      NOTIFICATION_ZONES_UPDATED_EVENT
    );
  });

  it('does not notify listeners that unsubscribed', () => {
    const listener = jest.fn();
    window.addEventListener(NOTIFICATION_ZONES_UPDATED_EVENT, listener);
    window.removeEventListener(NOTIFICATION_ZONES_UPDATED_EVENT, listener);
    emitNotificationZonesUpdated();
    expect(listener).not.toHaveBeenCalled();
  });

  it('fires once per call', () => {
    const listener = jest.fn();
    window.addEventListener(NOTIFICATION_ZONES_UPDATED_EVENT, listener);
    emitNotificationZonesUpdated();
    emitNotificationZonesUpdated();
    window.removeEventListener(NOTIFICATION_ZONES_UPDATED_EVENT, listener);
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
