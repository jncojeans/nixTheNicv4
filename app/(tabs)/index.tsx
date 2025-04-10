import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Pressable, Platform, NativeModules } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { HorizontalProgress } from '@/components/HorizontalProgress';
import { TimeSinceLastPouch } from '@/components/TimeSinceLastPouch';
import { Timer, Pause, Play, CircleStop as StopCircle } from 'lucide-react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { supabase } from '@/lib/supabase';
import { PostgrestError } from '@supabase/supabase-js';
import { startPouchActivity, updatePouchActivity, endPouchActivity } from '@/lib/liveActivities';

const BACKGROUND_FETCH_TASK = 'background-fetch';

// Define the background task
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return BackgroundFetch.BackgroundFetchResult.NoData;

  const { data: activePouches } = await supabase
    .from('pouches')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .is('end_time', null);

  if (!activePouches?.length) return BackgroundFetch.BackgroundFetchResult.NoData;

  for (const pouch of activePouches) {
    const elapsedTime = (Date.now() - new Date(pouch.start_time).getTime()) / 1000;
    const pauseDuration = pouch.total_pause_duration ? 
      parseInt(pouch.total_pause_duration.replace(' seconds', '')) : 0;
    
    const actualDuration = (elapsedTime - pauseDuration) / 60;
    
    if (actualDuration >= pouch.target_duration) {
      await supabase
        .from('pouches')
        .update({
          end_time: new Date().toISOString(),
          is_active: false,
          paused_at: null
        })
        .eq('id', pouch.id);

      if (Platform.OS !== 'web') {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Pouch Timer Complete',
            body: 'Your pouch timer has finished!',
            sound: true,
          },
          trigger: null,
        });
      }
    }
  }

  return BackgroundFetch.BackgroundFetchResult.NewData;
});

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function Dashboard() {
  const [duration, setDuration] = useState(0);
  const [remainingTime, setRemainingTime] = useState(0);
  const [pouchCount, setPouchCount] = useState(0);
  const [targetPouches, setTargetPouches] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentPouchId, setCurrentPouchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [backgroundTaskRegistered, setBackgroundTaskRegistered] = useState(false);
  const [lastPouchEndTime, setLastPouchEndTime] = useState<string | null>(null);
  const [timeBetweenPouches, setTimeBetweenPouches] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  // Function to schedule a notification for when the timer will end
  const scheduleTimerEndNotification = async (pouchId: string, durationMinutes: number) => {
    if (Platform.OS === 'web') return;
    
    try {
      console.log(`Attempting to schedule notification for pouch ${pouchId} with duration ${durationMinutes} minutes`);
      
      // Request permissions if needed
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        if (newStatus !== 'granted') {
          console.log('Notification permission denied');
          return;
        }
      }
      
      // Cancel any existing notifications for this pouch
      await cancelPouchNotifications(pouchId);
      
      // Only schedule if duration is positive (otherwise it's an immediate notification)
      if (durationMinutes <= 0) {
        console.log(`Not scheduling notification for pouch ${pouchId} as duration is ${durationMinutes}`);
        return;
      }
      
      // Calculate the exact time when the notification should trigger
      const secondsToTrigger = durationMinutes * 60;
      const triggerDate = new Date(Date.now() + (secondsToTrigger * 1000));
      
      console.log(`Scheduling notification to trigger at: ${triggerDate.toISOString()}`);
      
      // Schedule the notification with a format that works in Expo
      const notificationContent = {
        title: 'Pouch Timer Complete',
        body: 'Your pouch timer has finished!',
        sound: true,
        data: { pouchId }
      };
      
      // Use a simpler approach that works in Expo
      // The TypeScript definitions for Expo notifications don't match the actual API
      // @ts-ignore
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: { seconds: secondsToTrigger }
      });
      
      console.log(`Successfully scheduled notification ${notificationId} for pouch ${pouchId}`);
      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  };
  
  // Function to cancel notifications for a specific pouch
  const cancelPouchNotifications = async (pouchId: string) => {
    if (Platform.OS === 'web') return;
    
    try {
      // Get all scheduled notifications
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      
      // Find and cancel notifications for this pouch
      for (const notification of scheduledNotifications) {
        if (notification.content.data?.pouchId === pouchId) {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
          console.log(`Cancelled notification ${notification.identifier} for pouch ${pouchId}`);
        }
      }
    } catch (error) {
      console.error('Failed to cancel notifications:', error);
    }
  };

  // Register background fetch task
  useEffect(() => {
    const registerBackgroundFetch = async () => {
      try {
        if (Platform.OS === 'web') return;
        
        if (!backgroundTaskRegistered) {
          await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
            minimumInterval: 60, // 1 minute
            stopOnTerminate: false,
            startOnBoot: true,
          });
          setBackgroundTaskRegistered(true);
        }
      } catch (err) {
        console.warn(
          "Background fetch task registration failed:", 
          err instanceof Error ? err.message : 'Unknown error'
        );
      }
    };

    registerBackgroundFetch();
  }, [backgroundTaskRegistered]);

  // Cleanup background task on unmount
  useEffect(() => {
    return () => {
      if (Platform.OS !== 'web' && backgroundTaskRegistered) {
        BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK).catch(() => {
          // Ignore cleanup errors
        });
      }
    };
  }, [backgroundTaskRegistered]);

  // Check for expired pouches when the component mounts
  useEffect(() => {
    const checkForExpiredPouches = async () => {
      if (Platform.OS === 'web') return;
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data: activePouches } = await supabase
          .from('pouches')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .is('end_time', null)
          .order('start_time', { ascending: false })
          .limit(1);

        if (activePouches?.length) {
          for (const pouch of activePouches) {
            const startTime = new Date(pouch.start_time).getTime();
            const pauseDuration = pouch.total_pause_duration ? 
              parseInt(pouch.total_pause_duration.replace(' seconds', '')) : 0;
            const targetDurationMs = pouch.target_duration * 60 * 1000;
            const expectedEndTime = startTime + targetDurationMs + (pauseDuration * 1000);
            
            // If the pouch should have ended but hasn't been marked as ended
            if (Date.now() >= expectedEndTime) {
              await supabase
                .from('pouches')
                .update({
                  end_time: new Date().toISOString(),
                  is_active: false,
                  paused_at: null
                })
                .eq('id', pouch.id);
                
              // Schedule notification for this completed pouch
              await scheduleTimerEndNotification(pouch.id, 0); // 0 minutes means send immediately
            }
          }
        }
      } catch (error) {
        console.error('Error checking for expired pouches:', error);
      }
    };
    
    // Run this check when the component mounts
    checkForExpiredPouches();
  }, []);

  const fetchHabits = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      // Get today's schedule
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: schedule, error: scheduleError } = await supabase
        .from('weaning_schedule_days')
        .select(`
          pouches_allowed,
          duration_per_pouch,
          time_between_pouches,
          weaning_plans!inner(user_id)
        `)
        .eq('weaning_plans.user_id', user.id)
        .eq('date', today.toISOString().split('T')[0]);

      if (scheduleError) throw scheduleError;

      // Handle case where no schedule is found
      if (!schedule || schedule.length === 0) {
        setDuration(0);
        setRemainingTime(0);
        setTimeBetweenPouches(0);
        setTargetPouches(0);
        setError('No schedule found for today. Please check your weaning plan.');
        setLoading(false);
        return;
      }

      const scheduleData = schedule[0];
      const durationInSeconds = scheduleData.duration_per_pouch * 60;
      setDuration(durationInSeconds);
      setRemainingTime(durationInSeconds);
      setTimeBetweenPouches(scheduleData.time_between_pouches);
      setTargetPouches(scheduleData.pouches_allowed);

      // Check for active pouches (without an end time)
      const { data: activePouches, error: activePouchesError } = await supabase
        .from('pouches')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .is('end_time', null)
        .order('start_time', { ascending: false })
        .limit(1);

      if (activePouchesError) throw activePouchesError;
      
      // If we have an active pouch, set the state to show the active pouch UI
      if (activePouches && activePouches.length > 0) {
        const activePouch = activePouches[0];
        setCurrentPouchId(activePouch.id);
        setIsActive(true);
        setIsPaused(activePouch.paused_at !== null);
        
        // Calculate remaining time for the active pouch
        const now = new Date().getTime();
        const startTime = new Date(activePouch.start_time).getTime();
        const pauseDuration = activePouch.total_pause_duration ? 
          parseInt(activePouch.total_pause_duration.replace(' seconds', '')) : 0;
        
        // Calculate elapsed time in seconds, accounting for pauses
        const elapsedSeconds = Math.floor((now - startTime) / 1000) - pauseDuration;
        
        // Calculate remaining time
        const newRemainingTime = Math.max(0, duration - elapsedSeconds);
        setRemainingTime(newRemainingTime);
      } else {
        // Check for the most recent completed pouch to show time since last pouch
        const { data: pouches, error: pouchesError } = await supabase
          .from('pouches')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', false)
          .not('end_time', 'is', null)
          .order('end_time', { ascending: false })
          .limit(1);

        if (pouchesError) throw pouchesError;
        if (pouches && pouches.length > 0 && pouches[0].end_time) {
          setLastPouchEndTime(pouches[0].end_time);
        }
      }

      const { data: todaysPouches, error: todaysPouchesError } = await supabase
        .from('pouches')
        .select('id')
        .eq('user_id', user.id)
        .gte('start_time', today.toISOString())
        .lt('start_time', new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString());

      if (todaysPouchesError) throw todaysPouchesError;
      setPouchCount(todaysPouches?.length || 0);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  useEffect(() => {
    const requestPermissions = async () => {
      if (Platform.OS !== 'web') {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          setError('Permission to send notifications was denied');
        }
      }
    };

    requestPermissions();
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError) && Platform.OS !== 'web') {
      SplashScreen.hideAsync().catch(() => {
        // Ignore errors when hiding splash screen
      });
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isActive && !isPaused && currentPouchId) {
      interval = setInterval(() => {
        // Fetch the current pouch to get the start time and pause information
        try {
          supabase
            .from('pouches')
            .select('start_time, total_pause_duration')
            .eq('id', currentPouchId)
            .single()
            .then(({ data: pouch, error }) => {
              if (error) {
                // Handle error silently without console.error which might cause issues
                return;
              }
              
              if (!pouch) {
                // If pouch doesn't exist, stop the timer
                handleStop();
                return;
              }

              const now = new Date().getTime();
              const startTime = new Date(pouch.start_time).getTime();
              const pauseDuration = pouch.total_pause_duration ? 
                parseInt(pouch.total_pause_duration.replace(' seconds', '')) : 0;
              
              // Calculate elapsed time in seconds, accounting for pauses
              const elapsedSeconds = Math.floor((now - startTime) / 1000) - pauseDuration;
              
              // Calculate remaining time
              const newRemainingTime = duration - elapsedSeconds;
              
              setRemainingTime(newRemainingTime);
              
              // Handle timer completion
              if (newRemainingTime <= 0 && !isActive) {
                // Schedule notification when timer ends
                if (Platform.OS !== 'web') {
                  Notifications.scheduleNotificationAsync({
                    content: {
                      title: 'Pouch Timer Complete',
                      body: 'Your pouch timer has finished!',
                      sound: true,
                    },
                    trigger: null, // Send immediately
                  });
                }
                handleStop();
              }
            });
        } catch (err) {
          // Catch any unexpected errors and handle them silently
          // This ensures the app doesn't crash if there's an issue with the database
        }
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isActive, isPaused, currentPouchId, duration]);

  useEffect(() => {
    const updateLiveActivity = async () => {
      if (Platform.OS !== 'ios' || !isActive || !currentPouchId) return;
      
      try {
        if (remainingTime <= 0) {
          // End the Live Activity if timer has expired
          await endPouchActivity(currentPouchId, true);
        } else {
          // Update the Live Activity with remaining time
          await updatePouchActivity(currentPouchId, remainingTime, false);
        }
      } catch (error) {
        console.error('Error updating Live Activity:', error);
      }
    };
    
    updateLiveActivity();
  }, [remainingTime, isActive, currentPouchId]);

  const handleError = (error: PostgrestError | Error) => {
    setError(error instanceof Error ? error.message : 'An error occurred');
    setLoading(false);
  };

  if (!fontsLoaded && !fontError) {
    return <View style={styles.background} />;
  }

  // Start a new pouch timer
  const handleStart = async () => {
    try {
      setError(null);
      
      if (!duration) {
        setError('Please set a duration first');
        return;
      }
      
      // Request notification permissions if needed
      if (Platform.OS !== 'web') {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          setError('Permission to send notifications was denied');
          return;
        }
      }
      
      setIsActive(true);
      setIsPaused(false);
      
      const startTime = new Date().toISOString();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      // Get today's schedule to get the correct duration_per_pouch value
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: schedule, error: scheduleError } = await supabase
        .from('weaning_schedule_days')
        .select(`
          duration_per_pouch,
          weaning_plans!inner(user_id)
        `)
        .eq('weaning_plans.user_id', user.id)
        .eq('date', today.toISOString().split('T')[0]);

      if (scheduleError) throw scheduleError;
      
      // Handle case where no schedule is found
      if (!schedule || schedule.length === 0) {
        throw new Error('No schedule found for today. Please check your weaning plan.');
      }

      // Use the duration_per_pouch value directly from the schedule (in minutes)
      const targetDuration = schedule[0].duration_per_pouch;

      // Create a new pouch in the database
      const { data: pouch, error: pouchError } = await supabase
        .from('pouches')
        .insert({
          user_id: user.id,
          start_time: startTime,
          target_duration: targetDuration, // Use the value from weaning_schedule_days directly
          is_active: true,
          total_pause_duration: '0 seconds'
        })
        .select()
        .single();

      if (pouchError) throw pouchError;
      if (!pouch) throw new Error('Failed to create pouch');

      setCurrentPouchId(pouch.id);
      setPouchCount(prev => prev + 1);
      
      // Schedule notification for when the timer will end
      if (Platform.OS !== 'web') {
        console.log(`Scheduling notification for pouch ${pouch.id} with duration ${targetDuration} minutes`);
        await scheduleTimerEndNotification(pouch.id, targetDuration);
      }
      
      // Start Live Activity on iOS, but don't schedule another notification
      if (Platform.OS === 'ios') {
        console.log(`Starting Live Activity for pouch ${pouch.id} with duration ${targetDuration} minutes`);
        try {
          // We're passing null as the third parameter to avoid scheduling a notification
          if (NativeModules.PouchTimerActivity) {
            // Calculate start and end times
            const startTime = new Date();
            const endTime = new Date(startTime.getTime() + targetDuration * 60 * 1000);
            
            // Start Live Activity directly without going through startPouchActivity
            await NativeModules.PouchTimerActivity.startActivity(
              pouch.id,
              "Pouch Timer",
              startTime,
              endTime
            );
          } else {
            console.log('PouchTimerActivity not available, skipping Live Activity');
          }
        } catch (error) {
          console.error('Failed to start Live Activity:', error);
          // No fallback notification here as we already scheduled one above
        }
      }
    } catch (err) {
      handleError(err as Error | PostgrestError);
      return;
    }
  };

  const handlePause = () => {
    if (currentPouchId) {
      supabase
        .from('pouches')
        .update({
          paused_at: new Date().toISOString(),
        })
        .eq('id', currentPouchId)
        .then(({ error }) => {
          if (error) {
            handleError(error);
            return;
          }
          setIsPaused(true);
        });
    }
  };

  const handleResume = () => {
    if (currentPouchId) {
      supabase
        .from('pouches')
        .select('paused_at')
        .eq('id', currentPouchId)
        .single()
        .then(({ data: pouch, error }) => {
          if (error) {
            handleError(error);
            return;
          }
          
          if (pouch?.paused_at) {
            const pauseDuration = (Date.now() - new Date(pouch.paused_at).getTime()) / 1000;
            
            supabase
              .from('pouches')
              .update({
                paused_at: null,
                total_pause_duration: `${Math.floor(pauseDuration)} seconds`
              })
              .eq('id', currentPouchId)
              .then(({ error: updateError }) => {
                if (updateError) {
                  handleError(updateError);
                  return;
                }
                setIsPaused(false);
              });
          }
        });
    }
  };

  const handleStop = async () => {
    if (!currentPouchId) return;
    
    try {
      // Update the pouch in the database
      const { data: pouch, error: pouchError } = await supabase
        .from('pouches')
        .update({
          end_time: new Date().toISOString(),
          is_active: false,
          paused_at: null
        })
        .eq('id', currentPouchId)
        .select()
        .single();

      if (pouchError) throw pouchError;
      if (pouch?.end_time) {
        setLastPouchEndTime(pouch.end_time);
      }
      
      // Cancel any scheduled notifications for this pouch
      if (Platform.OS !== 'web') {
        await cancelPouchNotifications(currentPouchId);
      }
      
      // End Live Activity on iOS
      if (Platform.OS === 'ios') {
        await endPouchActivity(currentPouchId, true);
      }
    } catch (err) {
      handleError(err as Error | PostgrestError);
      return;
    }

    setIsActive(false);
    setIsPaused(false);
    setRemainingTime(duration);
    setCurrentPouchId(null);
  };

  const progress = remainingTime / duration;
  const pouchProgress = pouchCount / targetPouches;

  const getProgressColor = (progress: number) => {
    if (progress >= 0.9) return '#ef4444'; // Red
    if (progress >= 0.8) return '#f97316'; // Orange
    if (progress >= 0.75) return '#eab308'; // Yellow
    return '#00A3A3'; // Default teal
  };

  return (
    <View style={styles.background}>
      <View style={styles.container}>
        <View style={styles.contentContainer}>
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : loading ? (
            <Text style={styles.loadingText}>Loading...</Text>
          ) : (
            <>
              <Text style={styles.title}>Pouch Tracker</Text>
              <View style={styles.pouchCountContainer}>
                <Text style={styles.pouchCountText}>Today's Pouches</Text>
                <Text style={styles.pouchCount}>{pouchCount} / {targetPouches}</Text>
                <View style={styles.progressBarContainer}>
                  <View 
                    style={[
                      styles.progressBar, 
                      { 
                        width: `${pouchProgress * 100}%`,
                        backgroundColor: getProgressColor(pouchProgress)
                      }
                    ]} 
                  />
                </View>
              </View>
              {!isActive ? (
                <View style={styles.buttonContainer}>
                  {lastPouchEndTime && timeBetweenPouches > 0 && (
                    <TimeSinceLastPouch
                      lastPouchEndTime={lastPouchEndTime}
                      timeBetweenPouches={timeBetweenPouches}
                    />
                  )}
                  <Pressable
                    style={styles.mainButton}
                    onPress={handleStart}
                  >
                    <Text style={styles.mainButtonText}>Start New Pouch</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.currentPouchContainer}>
                  <Text style={styles.currentPouchTitle}>Current Pouch</Text>
                  <View style={styles.timerContainer}>
                    <HorizontalProgress
                      progress={progress}
                      duration={duration}
                      remainingTime={remainingTime}
                    />
                  </View>
                  <Pressable
                    style={styles.finishEarlyButton}
                    onPress={handleStop}
                  >
                    <Text style={styles.finishEarlyText}>End Pouch</Text>
                  </Pressable>
                </View>
              )}
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#F0F0F3',
  },
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  contentContainer: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F0F3',
    borderRadius: 30,
    padding: 20,
  },
  title: {
    fontSize: 32,
    color: '#666',
    textAlign: 'center',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 32,
  },
  pouchCountContainer: {
    width: '100%',
    backgroundColor: '#F0F0F3',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 10, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: '10px 10px 20px #D1D9E6, -10px -10px 20px #FFFFFF',
      }
    }),
  },
  progressBarContainer: {
    width: '100%',
    height: 4,
    backgroundColor: '#E0E0E3',
    borderRadius: 2,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  pouchCountText: {
    fontSize: 18,
    color: '#666',
    fontFamily: 'Inter-Regular',
  },
  pouchCount: {
    fontSize: 24,
    color: '#666',
    fontFamily: 'Inter-SemiBold',
    marginTop: 8,
  },
  currentPouchContainer: {
    width: '100%',
    marginTop: 20,
  },
  currentPouchTitle: {
    fontSize: 24,
    color: '#666',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 16,
  },
  timerContainer: {
    marginBottom: 32,
  },
  buttonContainer: {
    width: '100%',
  },
  mainButton: {
    backgroundColor: '#F0F0F3',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 20,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 10, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: '10px 10px 20px #D1D9E6, -10px -10px 20px #FFFFFF',
      }
    }),
  },
  mainButtonText: {
    color: '#00A3A3',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  finishEarlyButton: {
    backgroundColor: '#F0F0F3',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#ef4444',
        shadowOffset: { width: 10, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: '10px 10px 20px #D1D9E6, -10px -10px 20px #FFFFFF',
      }
    }),
  },
  finishEarlyText: {
    color: '#ef4444',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'Inter-Regular',
  },
  loadingText: {
    color: '#666',
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
  },
});