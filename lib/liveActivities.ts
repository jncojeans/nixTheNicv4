import { Platform, NativeModules } from 'react-native';
import * as Notifications from 'expo-notifications';

// Check if the PouchTimerActivity module is available
const PouchTimerActivity = Platform.OS === 'ios' ? NativeModules.PouchTimerActivity : null;

// Interface for Live Activity data
interface PouchActivityAttributes {
  remainingTime: number;
  duration: number;
  progress: number;
  isActive: boolean;
}

// Function to format time for display
const formatTime = (seconds: number): string => {
  const minutes = Math.floor(Math.abs(seconds) / 60);
  const remainingSeconds = Math.abs(seconds) % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// Check if Live Activities are supported
export const areLiveActivitiesSupported = (): boolean => {
  if (Platform.OS !== 'ios') return false;
  
  // Check if iOS version supports Live Activities (iOS 16.1+)
  const iosVersion = parseInt(Platform.Version, 10);
  if (iosVersion < 16.1) return false;
  
  // Check if the native module is available
  if (!PouchTimerActivity) return false;
  
  // Check if Live Activities are enabled on the device
  return PouchTimerActivity.areActivitiesEnabled?.() || false;
};

// Start a Live Activity for the current pouch
export const startPouchActivity = async (
  pouchId: string,
  pouchName: string,
  durationMinutes: number
): Promise<string | null> => {
  if (!areLiveActivitiesSupported()) {
    console.log(`Live Activities not supported, falling back to notification for pouch ${pouchId}`);
    // Fall back to regular notification for non-iOS or unsupported iOS versions
    // Note: We're not scheduling here anymore as it's handled in index.tsx
    return null;
  }
  
  try {
    // Calculate start and end times
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);
    
    console.log(`Starting Live Activity for pouch ${pouchId} from ${startTime} to ${endTime}`);
    
    // Start Live Activity
    const activityId = await PouchTimerActivity.startActivity(
      pouchId,
      pouchName || 'Pouch Timer',
      startTime,
      endTime
    );
    
    // We're no longer scheduling a notification here as it's handled in index.tsx
    
    return activityId;
  } catch (error) {
    console.error('Failed to start Live Activity:', error);
    
    // We're no longer scheduling a notification here as it's handled in index.tsx
    return null;
  }
};

// Update an existing Live Activity
export const updatePouchActivity = async (
  pouchId: string,
  remainingSeconds: number,
  isCompleted: boolean = false
): Promise<boolean> => {
  if (!areLiveActivitiesSupported()) return false;
  
  try {
    return await PouchTimerActivity.updateActivity(
      pouchId,
      remainingSeconds,
      isCompleted
    );
  } catch (error) {
    console.error('Failed to update Live Activity:', error);
    return false;
  }
};

// End a Live Activity
export const endPouchActivity = async (
  pouchId: string,
  isCompleted: boolean = true
): Promise<boolean> => {
  if (!areLiveActivitiesSupported()) {
    // Cancel any scheduled notifications
    await cancelCompletionNotification(pouchId);
    return false;
  }
  
  try {
    // Cancel any scheduled notifications
    await cancelCompletionNotification(pouchId);
    
    // End the Live Activity
    return await PouchTimerActivity.endActivity(pouchId, isCompleted);
  } catch (error) {
    console.error('Failed to end Live Activity:', error);
    return false;
  }
};

// End all active Live Activities
export const endAllPouchActivities = async (): Promise<boolean> => {
  if (!areLiveActivitiesSupported()) return false;
  
  try {
    return await PouchTimerActivity.endAllActivities();
  } catch (error) {
    console.error('Failed to end all Live Activities:', error);
    return false;
  }
};

// Schedule a notification for when the pouch timer completes
// This serves as a fallback for devices that don't support Live Activities
export const scheduleCompletionNotification = async (
  pouchId: string,
  durationMinutes: number
): Promise<string | null> => {
  console.log(`DISABLED: Not scheduling completion notification for pouch ${pouchId} from liveActivities.ts`);
  // This function is now disabled to prevent duplicate notifications
  // All notification scheduling is handled in index.tsx
  return null;
};

// Cancel a scheduled completion notification
export const cancelCompletionNotification = async (pouchId: string): Promise<void> => {
  try {
    // Get all scheduled notifications
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    
    // Find notifications for this pouch
    const pouchNotifications = scheduledNotifications.filter(
      notification => notification.content.data?.pouchId === pouchId
    );
    
    // Cancel each notification
    for (const notification of pouchNotifications) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  } catch (error) {
    console.error('Failed to cancel completion notification:', error);
  }
};
