import { supabase } from './supabaseClient';

const busSaveQueues = new Map();

async function invokeBusTelemetry(body, accessToken) {
  if (!supabase) {
    throw new Error('Supabase is not configured. Configure the Supabase project before signing in.');
  }

  const { data, error } = await supabase.functions.invoke('bus-telemetry', {
    body,
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
  });

  if (error) {
    const response = error.context;
    if (response instanceof Response) {
      if ([404, 500, 502, 503].includes(response.status)) {
        throw new Error(
          'The secure sign-in service is not deployed or is not configured. Please contact the portal administrator.'
        );
      }
      try {
        const details = await response.json();
        if (details.error) throw new Error(details.error);
      } catch (responseError) {
        if (responseError instanceof Error && responseError.message !== error.message) {
          throw responseError;
        }
      }
    }
    if (!(response instanceof Response)) {
      throw new Error(
        'Could not connect to the secure sign-in service. Check your connection or contact the portal administrator.'
      );
    }
    throw new Error(error.message);
  }

  return data;
}

export async function loginBusSync(phone, pin) {
  return invokeBusTelemetry({ action: 'login', phone, pin });
}

export async function readBusTelemetry(accessToken) {
  const result = await invokeBusTelemetry({ action: 'read' }, accessToken);
  return result.data;
}

export async function saveBusTelemetry(accessToken, busNumber, changes) {
  const key = Number(busNumber);
  const previousSave = busSaveQueues.get(key) || Promise.resolve();
  const currentSave = previousSave
    .catch(() => undefined)
    .then(() => invokeBusTelemetry(
      { action: 'upsert', bus_number: key, changes },
      accessToken
    ));
  busSaveQueues.set(key, currentSave);
  return currentSave;
}

export async function logoutBusSync(accessToken) {
  return invokeBusTelemetry({ action: 'logout' }, accessToken);
}
