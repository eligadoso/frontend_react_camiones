import { env } from "../config/env";
import { requestJson } from "./httpClient";

export function getBackendHealth() {
  return requestJson(`${env.pythonApiUrl}/health`);
}
