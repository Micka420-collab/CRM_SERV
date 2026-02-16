/**
 * Remote License Client for ITStock CRM
 *
 * Handles communication with the remote license server.
 * Replaces the local HMAC-based validation with server-authoritative checks.
 */

const crypto = require('crypto');
const { getHardwareId } = require('./hardwareId');
const os = require('os');

const LICENSE_SERVER_URL = process.env.LICENSE_SERVER_URL || 'http://localhost:4000';
const API_KEY = process.env.LICENSE_CLIENT_API_KEY || '';
const SIGNING_SECRET = process.env.LICENSE_CLIENT_SECRET || '';

/**
 * Make an authenticated request to the license server
 */
async function serverRequest(endpoint, body = {}) {
  const url = `${LICENSE_SERVER_URL}/api/v1/licenses${endpoint}`;
  const timestamp = Date.now().toString();

  const headers = {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
    'X-Timestamp': timestamp
  };

  // Sign the request if signing secret is configured
  if (SIGNING_SECRET && body.licenseKey && body.hardwareId) {
    const signature = crypto
      .createHmac('sha256', SIGNING_SECRET)
      .update(`${body.licenseKey}:${body.hardwareId}:${timestamp}`)
      .digest('hex');
    headers['X-Signature'] = signature;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal
    });

    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('SERVER_TIMEOUT');
    }
    throw new Error('SERVER_UNREACHABLE');
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Validate license with remote server
 */
async function validateWithServer(licenseKey) {
  const hardwareId = getHardwareId();
  const result = await serverRequest('/validate', { licenseKey, hardwareId });
  return result.data;
}

/**
 * Activate license on remote server
 */
async function activateWithServer(licenseKey) {
  const hardwareId = getHardwareId();
  const machineName = os.hostname();
  const result = await serverRequest('/activate', { licenseKey, hardwareId, machineName });
  return result.data;
}

/**
 * Deactivate license on remote server
 */
async function deactivateWithServer(licenseKey) {
  const hardwareId = getHardwareId();
  const result = await serverRequest('/deactivate', { licenseKey, hardwareId });
  return result.data;
}

/**
 * Send heartbeat to remote server
 */
async function heartbeat(licenseKey) {
  const hardwareId = getHardwareId();
  const result = await serverRequest('/heartbeat', { licenseKey, hardwareId });
  return result.data;
}

module.exports = {
  validateWithServer,
  activateWithServer,
  deactivateWithServer,
  heartbeat
};
