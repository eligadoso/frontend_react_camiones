export const env = {
  webhookApiUrl:
    import.meta.env.VITE_WEBHOOK_API_URL ||
    "http://localhost:8000/api/webhooks/thingspeak",
  pythonApiUrl: import.meta.env.VITE_PYTHON_API_URL || "http://localhost:8000/api",
};
