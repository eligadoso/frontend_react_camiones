import { env } from "../config/env";
import { requestJson } from "./httpClient";

export function login(username, password) {
  return requestJson(`${env.pythonApiUrl}/auth/login`, {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function logout() {
  return requestJson(`${env.pythonApiUrl}/auth/logout`, {
    method: "POST",
  });
}

export function me() {
  return requestJson(`${env.pythonApiUrl}/auth/me`);
}
