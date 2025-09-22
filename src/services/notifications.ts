import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';

const expo = new Expo();

export async function sendExpoNotificationsAsync(messages: ExpoPushMessage[]): Promise<ExpoPushTicket[]> {
  const chunks = expo.chunkPushNotifications(messages);
  const tickets: ExpoPushTicket[] = [];
  for (const chunk of chunks) {
    try {
      const t = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...t);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Expo push error:', error);
    }
  }
  return tickets;
}

export function buildMessage(to: string, title: string, body: string): ExpoPushMessage {
  return {
    to,
    sound: 'default',
    title,
    body
  };
}


