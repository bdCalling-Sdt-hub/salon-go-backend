import admin from "firebase-admin";
import config from "../config";

const serviceAccountJson = Buffer.from(config.firebase_service_account_base64!, "base64").toString("utf8");
const serviceAccount = JSON.parse(serviceAccountJson);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});

export const sendPushNotification = async (deviceToken: string, title: string, body: string, data = {}) => {
    const message = {
      token: deviceToken,
      notification: {
        title: title,
        body: body,
      },
      data: data, // Optional data payload
    };
  
    try {
      const response = await admin.messaging().send(message);
      console.log('Successfully sent message:', response);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };
