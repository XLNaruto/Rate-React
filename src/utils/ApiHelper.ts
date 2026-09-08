import axios from 'axios';
import { emitRateLimited } from './RateLimit';

const URL = {
  apiUrl: import.meta.env.VITE_APP_API_URL
};

// When the API replies 429 (Too Many Requests), signal the app to show the
// friendly rate-limit page. Returns true so callers can short-circuit.
const handleRateLimit = (res: any): boolean => {
  if (String(res?.status) === '429') {
    // The API sends x-ratelimit-reset = seconds until the limit resets.
    // Fall back to Retry-After, then to a default handled downstream (60s).
    const reset =
      res?.headers?.['x-ratelimit-reset'] ?? res?.headers?.['retry-after'];
    emitRateLimited(reset);
    return true;
  }
  return false;
};

// 4xx responses (401/403/404/422 …) are returned to the caller as-is: this is a
// public app with no user session, so the caller decides what to render — e.g. a
// 403 SCAN_NOT_ACCEPTING becomes the "not accepting responses" screen.
export const Securitykey = import.meta.env.VITE_APP_ENCRYPT_KEY || '';

// API HEADER
export const apiHeader = (isFormData: any) => {
  const authToken = import.meta.env.VITE_APP_API_TOKEN;
  if (!isFormData) {
    return {
      headers: {
        'x-authorization': authToken,
        'Content-Type': 'application/json'
      }
    };
  }

  if (isFormData) {
    return {
      headers: {
        'x-authorization': authToken,
        'Content-Type': 'multipart/form-data'
      }
    };
  }
};

// API CALL for POST method
export const postData = async (api: any, data: any, headers: any) => {
  try {
    const url = `${URL.apiUrl}${api}`;

    const response = await axios.post(url, data, headers);

    if (handleRateLimit(response)) return response;
    return response;
  } catch (error: any) {
    console.log('error ==============++==+=======+==+', error.message);
    console.log('error ==============++==+=======+==+', error);
    if (handleRateLimit(error?.response)) return error?.response;
    return error?.response;
  }
};

// API CALL for GET method
export const getData = async (api: any, params: any, headers: any) => {
  try {
    const url = `${URL.apiUrl}${api}`;

    const response = await axios.get(url, {
      params: params,
      headers: headers['headers']
    });

    if (handleRateLimit(response)) return response;
    return response;
  } catch (error: any) {
    console.log('Error:', error.message);
    if (handleRateLimit(error?.response)) return error?.response;
    return error?.response;
  }
};

// API CALL for PATCH method
export const patchData = async (api: any, data: any, headers: any) => {
  try {
    const url = `${URL.apiUrl}${api}`;

    const response = await axios.patch(url, data, headers);

    if (handleRateLimit(response)) return response;

    return response;
  } catch (error: any) {
    console.log('Error:', error.message);
    console.log('Error:::::::::::::::::::::::::::::::::', error);
    if (handleRateLimit(error?.response)) return error?.response;
    return error?.response;
  }
};

// API CALL for PUT method
export const putData = async (api: any, data: any, headers: any) => {
  try {
    const url = `${URL.apiUrl}${api}`;

    const response = await axios.put(url, data, headers);

    if (handleRateLimit(response)) return response;
    return response;
  } catch (error: any) {
    console.log('Error:', error.message);
    if (handleRateLimit(error?.response)) return error?.response;
    return error?.response;
  }
};

// API CALL for DELETE method
export const deleteData = async (api: any, data: any, headers: any) => {
  try {
    const url = `${URL.apiUrl}${api}`;

    const response = await axios.delete(url, {
      data,
      ...headers
    });

    if (handleRateLimit(response)) return response;
    return response;
  } catch (error: any) {
    console.log('Error:', error.message);

    if (handleRateLimit(error?.response)) return error?.response;

    return error?.response;
  }
};
