import { isAxiosError } from "axios";

type ExpressValidatorItem = { msg?: string; message?: string; param?: string };

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!isAxiosError(error)) return fallback;

  const data = error.response?.data as
    | { message?: string; errors?: Array<string | ExpressValidatorItem> }
    | undefined;

  if (data?.message && typeof data.message === "string") return data.message;

  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    const first = data.errors[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object") {
      if (typeof first.msg === "string") return first.msg;
      if (typeof first.message === "string") return first.message;
    }
  }

  if (!error.response) {
    return "Cannot reach the server. On a real device, set EXPO_PUBLIC_API_BASE_URL to http://YOUR_PC_LAN_IP:5000/api/v1 (localhost is the phone, not your computer).";
  }

  if (error.code === "ECONNABORTED") {
    return "Request timed out. Check your network and API URL.";
  }

  return fallback;
}
