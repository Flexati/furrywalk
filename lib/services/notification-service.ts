import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export interface ReminderNotification {
  id: string;
  title: string;
  body: string;
  type: "vaccine" | "antiparassite" | "grooming" | "walk";
  scheduledFor: Date;
  dogId: string;
}

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class NotificationService {
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      return status === "granted";
    } catch (error) {
      console.error("Permission request failed:", error);
      return false;
    }
  }

  async scheduleNotification(reminder: ReminderNotification): Promise<string | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: reminder.title,
          body: reminder.body,
          data: {
            type: reminder.type,
            dogId: reminder.dogId,
            reminderId: reminder.id,
          },
          sound: "default",
          badge: 1,
        },
        trigger: {
          type: "date" as any,
          date: reminder.scheduledFor,
        },
      });

      return notificationId;
    } catch (error) {
      console.error("Failed to schedule notification:", error);
      return null;
    }
  }

  async scheduleRecurringNotification(
    reminder: ReminderNotification,
    intervalDays: number
  ): Promise<string | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      // Schedule first notification
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: reminder.title,
          body: reminder.body,
          data: {
            type: reminder.type,
            dogId: reminder.dogId,
            reminderId: reminder.id,
          },
          sound: "default",
          badge: 1,
        },
        trigger: {
          type: "daily" as any,
          hour: 9, // 9 AM
          minute: 0,
        },
      });

      return notificationId;
    } catch (error) {
      console.error("Failed to schedule recurring notification:", error);
      return null;
    }
  }

  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error("Failed to cancel notification:", error);
    }
  }

  async sendLocalNotification(title: string, body: string): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: "default",
          badge: 1,
        },
        trigger: null, // Immediate notification
      });
    } catch (error) {
      console.error("Failed to send notification:", error);
    }
  }

  // Predefined reminders
  async scheduleVaccineReminder(dogId: string, daysUntil: number): Promise<string | null> {
    const date = new Date();
    date.setDate(date.getDate() + daysUntil);

    return this.scheduleNotification({
      id: `vaccine_${dogId}_${Date.now()}`,
      title: "💉 Vaccino in scadenza",
      body: "È ora di prenotare il vaccino del tuo cane",
      type: "vaccine",
      scheduledFor: date,
      dogId,
    });
  }

  async scheduleAntiparassiteReminder(dogId: string, daysUntil: number): Promise<string | null> {
    const date = new Date();
    date.setDate(date.getDate() + daysUntil);

    return this.scheduleNotification({
      id: `antiparassite_${dogId}_${Date.now()}`,
      title: "🐛 Antiparassitario in scadenza",
      body: "Ricordati di dare l'antiparassitario al tuo cane",
      type: "antiparassite",
      scheduledFor: date,
      dogId,
    });
  }

  async scheduleGroomingReminder(dogId: string, daysUntil: number): Promise<string | null> {
    const date = new Date();
    date.setDate(date.getDate() + daysUntil);

    return this.scheduleNotification({
      id: `grooming_${dogId}_${Date.now()}`,
      title: "✂️ Toelettatura consigliata",
      body: "È ora di portare il tuo cane dal toelettatore",
      type: "grooming",
      scheduledFor: date,
      dogId,
    });
  }

  async scheduleDailyWalkReminder(dogId: string, hour: number = 9): Promise<string | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: "🐕 Ora della passeggiata!",
          body: "Il tuo cane è pronto per una bella passeggiata",
          data: {
            type: "walk",
            dogId,
          },
          sound: "default",
          badge: 1,
        },
        trigger: {
          type: "daily" as any,
          hour,
          minute: 0,
        },
      });

      return notificationId;
    } catch (error) {
      console.error("Failed to schedule daily walk reminder:", error);
      return null;
    }
  }
}

export const notificationService = new NotificationService();

export function useNotificationService() {
  const scheduleVaccineReminder = async (dogId: string, daysUntil: number) => {
    return notificationService.scheduleVaccineReminder(dogId, daysUntil);
  };

  const scheduleAntiparassiteReminder = async (dogId: string, daysUntil: number) => {
    return notificationService.scheduleAntiparassiteReminder(dogId, daysUntil);
  };

  const scheduleGroomingReminder = async (dogId: string, daysUntil: number) => {
    return notificationService.scheduleGroomingReminder(dogId, daysUntil);
  };

  const scheduleDailyWalkReminder = async (dogId: string, hour?: number) => {
    return notificationService.scheduleDailyWalkReminder(dogId, hour);
  };

  const sendNotification = async (title: string, body: string) => {
    return notificationService.sendLocalNotification(title, body);
  };

  return {
    scheduleVaccineReminder,
    scheduleAntiparassiteReminder,
    scheduleGroomingReminder,
    scheduleDailyWalkReminder,
    sendNotification,
  };
}
