import { getBackendHealth } from "../api/pythonApi";
import { pullThingSpeakChannel, sendThingSpeakWebhook } from "../api/webhookApi";

export const dashboardService = {
  getBackendHealth,
  pullThingSpeakChannel,
  sendThingSpeakWebhook,
};
