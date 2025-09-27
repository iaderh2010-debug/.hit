// Simple in-memory notification store (for demo; use DB or Redis for production)
const notifications = {};

function addNotification(username, message) {
  if (!notifications[username]) notifications[username] = [];
  notifications[username].push({ message, time: Date.now() });
}

function getNotifications(username) {
  return notifications[username] || [];
}

function clearNotifications(username) {
  notifications[username] = [];
}

module.exports = { addNotification, getNotifications, clearNotifications };
