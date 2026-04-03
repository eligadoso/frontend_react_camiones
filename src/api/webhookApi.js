import { env } from "../config/env";
import { requestJson } from "./httpClient";

export function sendThingSpeakWebhook(payload) {
  return requestJson(env.webhookApiUrl, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function pullThingSpeakChannel(channelId) {
  return requestJson(`${env.webhookApiUrl}/pull/${channelId}`, {
    method: "POST",
  });
}
