/**
 * Healthcheck endpoint. Used by Kubernetes to check if the app is running.
 * Responds with a status message.
 */
export const loader = () => ({
  message: "Kill The Backlog is healthy and running.",
  timestamp: new Date().toISOString(),
});
