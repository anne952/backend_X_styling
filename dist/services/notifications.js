"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendExpoNotificationsAsync = sendExpoNotificationsAsync;
exports.buildMessage = buildMessage;
const expo_server_sdk_1 = require("expo-server-sdk");
const expo = new expo_server_sdk_1.Expo();
async function sendExpoNotificationsAsync(messages) {
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];
    for (const chunk of chunks) {
        try {
            const t = await expo.sendPushNotificationsAsync(chunk);
            tickets.push(...t);
        }
        catch (error) {
            // eslint-disable-next-line no-console
            console.error('Expo push error:', error);
        }
    }
    return tickets;
}
function buildMessage(to, title, body) {
    return {
        to,
        sound: 'default',
        title,
        body
    };
}
