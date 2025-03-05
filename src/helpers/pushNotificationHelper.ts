import admin from "firebase-admin";
import config from "../config";

const serviceAccountJson = Buffer.from(config.firebase_service_account_base64!, "base64").toString("utf8");
const serviceAccount = JSON.parse(serviceAccountJson);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});

export const sendPushNotification = async (
    deviceToken: string,
    title: string,
    body: string,
    data = {},
    icon?: string // Optional: Add an icon parameter
  ) => {

    const message = {
      token: deviceToken,
      notification: {
        title: title,
        body: body,
      },
      data: data, // Optional data payload
      android: {
        notification: {
          icon: icon || 'https://res.cloudinary.com/di2erk78w/image/upload/v1739447789/B694F238-61D7-490D-9F1B-3B88CD6DD094_1_1_kpjwlx.png',
        },
      },
      apns: {
        payload: {
          aps: {
            'mutable-content': 1, // Enable mutable content for iOS (if needed)
          },
        },
      },
    };
  
    try {
      if(deviceToken){
        const response = await admin.messaging().send(message);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };
