import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

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

// Start a Live Activity for the current pouch
export const startPouchActivity = async (
  pouchId: string,
  duration: number,
  remainingTime: number
): Promise<boolean> => {
  if (Platform.OS !== 'ios') return false;
  
  try {
    // Check if iOS version supports Live Activities (iOS 16.1+)
    const iosVersion = parseInt(Platform.Version, 10);
    if (iosVersion < 16.1) return false;
    
    // Calculate progress
    const progress = remainingTime / duration;
    
    // Prepare content for Live Activity
    const content = {
      title: 'Active Pouch',
      body: `Pouch Timer: ${formatTime(remainingTime)} remaining`,
      data: {
        activityType: 'pouch',
        pouchId,
        attributes: {
          remainingTime,
          duration,
          progress,
          isActive: true
        } as PouchActivityAttributes
      }
    };
    
    // Request permission if needed
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      if (newStatus !== 'granted') return false;
    }
    
    // Start Live Activity - using null trigger for immediate delivery
    await Notifications.scheduleNotificationAsync({
      content,
      trigger: null
    });
    
    return true;
  } catch (error) {
    console.error('Failed to start Live Activity:', error);
    return false;
  }
};

// Update an existing Live Activity
export const updatePouchActivity = async (
  pouchId: string,
  duration: number,
  remainingTime: number
): Promise<boolean> => {
  if (Platform.OS !== 'ios') return false;
  
  try {
    // Check if iOS version supports Live Activities (iOS 16.1+)
    const iosVersion = parseInt(Platform.Version, 10);
    if (iosVersion < 16.1) return false;
    
    // Calculate progress
    const progress = remainingTime / duration;
    
    // Prepare content for Live Activity update
    const content = {
      title: 'Active Pouch',
      body: `Pouch Timer: ${formatTime(remainingTime)} remaining`,
      data: {
        activityType: 'pouch',
        pouchId,
        attributes: {
          remainingTime,
          duration,
          progress,
          isActive: true
        } as PouchActivityAttributes
      }
    };
    
    // Update Live Activity - using null trigger for immediate delivery
    await Notifications.scheduleNotificationAsync({
      content,
      trigger: null
    });
    
    return true;
  } catch (error) {
    console.error('Failed to update Live Activity:', error);
    return false;
  }
};

// End a Live Activity
export const endPouchActivity = async (pouchId: string): Promise<boolean> => {
  if (Platform.OS !== 'ios') return false;
  
  try {
    // Check if iOS version supports Live Activities (iOS 16.1+)
    const iosVersion = parseInt(Platform.Version, 10);
    if (iosVersion < 16.1) return false;
    
    // Prepare content for ending Live Activity
    const content = {
      title: 'Pouch Timer Complete',
      body: 'Your pouch timer has finished!',
      data: {
        activityType: 'pouch',
        pouchId,
        attributes: {
          remainingTime: 0,
          duration: 0,
          progress: 0,
          isActive: false
        } as PouchActivityAttributes
      }
    };
    
    // End Live Activity - using null trigger for immediate delivery
    await Notifications.scheduleNotificationAsync({
      content,
      trigger: null
    });
    
    return true;
  } catch (error) {
    console.error('Failed to end Live Activity:', error);
    return false;
  }
};
