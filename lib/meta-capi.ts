/**
 * Server-side Meta Conversions API (CAPI) helper.
 * Sends events directly to Meta from the server, bypassing ad blockers
 * and ensuring reliable conversion tracking.
 *
 * Required env vars:
 *   META_PIXEL_ID          – your Meta pixel ID
 *   META_CAPI_ACCESS_TOKEN – system user / CAPI access token
 */

import { createHash } from 'crypto';

const PIXEL_ID = process.env.META_PIXEL_ID;
const ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN;
const API_VERSION = 'v21.0';

function sha256(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

interface UserData {
  email?: string;
  externalId?: string;
  clientIpAddress?: string;
  clientUserAgent?: string;
  fbc?: string;
  fbp?: string;
}

interface CAPIEvent {
  eventName: string;
  eventId?: string;
  eventTime?: number;
  userData: UserData;
  customData?: Record<string, unknown>;
  eventSourceUrl?: string;
  actionSource?: 'website' | 'server';
}

function buildUserDataPayload(user: UserData) {
  const payload: Record<string, string | string[]> = {};

  if (user.email) payload.em = [sha256(user.email)];
  if (user.externalId) payload.external_id = [sha256(user.externalId)];
  if (user.clientIpAddress) payload.client_ip_address = user.clientIpAddress;
  if (user.clientUserAgent) payload.client_user_agent = user.clientUserAgent;
  if (user.fbc) payload.fbc = user.fbc;
  if (user.fbp) payload.fbp = user.fbp;

  return payload;
}

export async function sendCAPIEvent(event: CAPIEvent): Promise<boolean> {
  if (!PIXEL_ID || !ACCESS_TOKEN) {
    console.warn(
      '⚠️ Meta CAPI: Missing META_PIXEL_ID or META_CAPI_ACCESS_TOKEN – skipping'
    );
    return false;
  }

  const url = `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events`;

  const payload = {
    data: [
      {
        event_name: event.eventName,
        event_time: event.eventTime ?? Math.floor(Date.now() / 1000),
        event_id: event.eventId,
        event_source_url:
          event.eventSourceUrl ?? process.env.NEXT_PUBLIC_APP_URL,
        action_source: event.actionSource ?? 'server',
        user_data: buildUserDataPayload(event.userData),
        custom_data: event.customData,
      },
    ],
  };

  try {
    const response = await fetch(`${url}?access_token=${ACCESS_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('❌ Meta CAPI error:', response.status, errorBody);
      return false;
    }

    const result = await response.json();
    console.log(`✅ Meta CAPI: ${event.eventName} sent`, result);
    return true;
  } catch (error) {
    console.error('❌ Meta CAPI request failed:', error);
    return false;
  }
}

export async function sendStartTrialEvent(data: {
  email: string;
  userId: string;
  planName: string;
  value: number;
  currency?: string;
  eventId?: string;
}) {
  return sendCAPIEvent({
    eventName: 'StartTrial',
    eventId: data.eventId,
    userData: {
      email: data.email,
      externalId: data.userId,
    },
    customData: {
      content_name: data.planName,
      value: data.value,
      currency: data.currency ?? 'USD',
      predicted_ltv: data.value,
    },
  });
}

export async function sendPurchaseEvent(data: {
  email: string;
  userId: string;
  planName: string;
  value: number;
  currency?: string;
  eventId?: string;
}) {
  return sendCAPIEvent({
    eventName: 'Purchase',
    eventId: data.eventId,
    userData: {
      email: data.email,
      externalId: data.userId,
    },
    customData: {
      content_name: data.planName,
      value: data.value,
      currency: data.currency ?? 'USD',
    },
  });
}
