import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { CircularCountdown } from '@/components/CircularCountdown';
import { supabase } from '@/lib/supabase';
import * as SplashScreen from 'expo-splash-screen';
import { Platform } from 'react-native';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Define types for our data
interface WeaningScheduleDay {
  id: string;
  day_number: number;
  stage: number;
  pouches_allowed: number;
  duration_per_pouch: number;
  time_between_pouches: number;
  date: string;
}

interface CurrentHabits {
  pouches_per_day: number;
  duration_per_pouch: number;
  time_between_pouches: number;
}

interface StageInfo {
  stage: number;
  firstDay: WeaningScheduleDay;
  differences?: {
    pouches: number;
    duration: number;
    timeBetween: number;
  };
}

export default function Plan() {
  const [quitDate, setQuitDate] = useState<string | null>(null);
  const [stageInfo, setStageInfo] = useState<StageInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  useEffect(() => {
    if ((fontsLoaded || fontError) && Platform.OS !== 'web') {
      SplashScreen.hideAsync().catch(() => {
        // Ignore errors when hiding splash screen
      });
    }
  }, [fontsLoaded, fontError]);

  // Memoize the fetchPlanData function to prevent recreation on every render
  const fetchPlanData = useCallback(async () => {
    if (retryCount > 3) {
      setError('Failed to load data after multiple attempts. Please try again later.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Get user with timeout to prevent hanging
      const userPromise = supabase.auth.getUser();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timed out')), 5000)
      );
      
      const { data: { user } } = await Promise.race([userPromise, timeoutPromise]) as any;
      
      if (!user) {
        setError('Please sign in to view your plan');
        setLoading(false);
        return;
      }

      // Get plan data with timeout
      const planPromise = supabase
        .from('weaning_plans')
        .select('id, quit_date')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      const { data: plan, error: planError } = await Promise.race([
        planPromise, 
        new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), 5000))
      ]) as any;

      if (planError) throw planError;
      
      if (!plan) {
        setError('No weaning plan found. Please create one first.');
        setLoading(false);
        return;
      }

      setQuitDate(plan.quit_date);

      // Fetch current habits for comparison with first stage
      const habitsPromise = supabase
        .from('current_habits')
        .select('pouches_per_day, duration_per_pouch, time_between_pouches')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const { data: currentHabits, error: habitsError } = await Promise.race([
        habitsPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), 5000))
      ]) as any;

      // We'll continue even if there's no current habits data
      let habits: CurrentHabits | null = null;
      if (!habitsError && currentHabits) {
        habits = currentHabits;
      }

      // Fetch weaning schedule days
      const schedulePromise = supabase
        .from('weaning_schedule_days')
        .select('*')
        .eq('weaning_plan_id', plan.id)
        .order('day_number', { ascending: true });

      const { data: scheduleDays, error: scheduleError } = await Promise.race([
        schedulePromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), 5000))
      ]) as any;

      if (scheduleError) throw scheduleError;

      if (!scheduleDays || scheduleDays.length === 0) {
        setError('No weaning schedule found. Please create one first.');
        setLoading(false);
        return;
      }

      // Process the schedule days to get the first day of each stage
      const stageMap = new Map<number, WeaningScheduleDay>();
      
      scheduleDays.forEach((day: WeaningScheduleDay) => {
        if (!stageMap.has(day.stage)) {
          stageMap.set(day.stage, day);
        }
      });

      // Convert the map to an array of stage info objects and sort by stage
      const stageInfoArray: StageInfo[] = Array.from(stageMap.entries())
        .map(([stage, firstDay]) => ({
          stage,
          firstDay
        }))
        .sort((a, b) => a.stage - b.stage);

      // Calculate differences between stages
      for (let i = 0; i < stageInfoArray.length; i++) {
        const currentStage = stageInfoArray[i];
        
        if (i === 0 && habits) {
          // For the first stage, compare with current habits
          currentStage.differences = {
            pouches: habits.pouches_per_day - currentStage.firstDay.pouches_allowed,
            duration: habits.duration_per_pouch - currentStage.firstDay.duration_per_pouch,
            timeBetween: habits.time_between_pouches - currentStage.firstDay.time_between_pouches
          };
        } else if (i > 0) {
          // For other stages, compare with the previous stage
          const prevStage = stageInfoArray[i - 1];
          currentStage.differences = {
            pouches: prevStage.firstDay.pouches_allowed - currentStage.firstDay.pouches_allowed,
            duration: prevStage.firstDay.duration_per_pouch - currentStage.firstDay.duration_per_pouch,
            timeBetween: prevStage.firstDay.time_between_pouches - currentStage.firstDay.time_between_pouches
          };
        }
      }

      setStageInfo(stageInfoArray);
      setError(null);
    } catch (err) {
      console.error('Error fetching plan data:', err);
      
      // Handle specific error types
      if (err instanceof Error) {
        if (err.message === 'Request timed out') {
          setError('Connection timed out. Please check your internet connection.');
        } else {
          setError(err.message || 'An error occurred while loading your plan');
        }
      } else {
        setError('An unexpected error occurred');
      }
      
      // Increment retry count for the next attempt
      setRetryCount(prev => prev + 1);
    } finally {
      setLoading(false);
    }
  }, [retryCount]);

  useEffect(() => {
    fetchPlanData();
    
    // Clean up function
    return () => {
      // Cancel any pending operations if needed
    };
  }, [fetchPlanData]);

  const handleRetry = () => {
    setError(null);
    setRetryCount(0);
    fetchPlanData();
  };

  if (!fontsLoaded && !fontError) {
    return <View style={styles.background} />;
  }

  return (
    <ErrorBoundary fallback={<ErrorFallback onRetry={handleRetry} />}>
      <View style={styles.background}>
        <View style={styles.container}>
          <View style={styles.contentContainer}>
            {error ? (
              <ErrorDisplay error={error} onRetry={handleRetry} />
            ) : loading ? (
              <LoadingDisplay />
            ) : quitDate ? (
              <PlanContent quitDate={quitDate} stageInfo={stageInfo} />
            ) : (
              <Text style={styles.errorText}>No quit date set</Text>
            )}
          </View>
        </View>
      </View>
    </ErrorBoundary>
  );
}

// Separate components to improve performance and readability
function PlanContent({ quitDate, stageInfo }: { quitDate: string, stageInfo: StageInfo[] }) {
  return (
    <>
      <CircularCountdown quitDate={quitDate} />
      
      <View style={styles.stagesContainer}>
        <Text style={styles.sectionTitle}>Stages</Text>
        <ScrollView 
          horizontal={true} 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stagesScrollContent}
        >
          {stageInfo.map((info) => (
            <StageCard key={info.stage} stageInfo={info} />
          ))}
        </ScrollView>
      </View>
    </>
  );
}

function StageCard({ stageInfo }: { stageInfo: StageInfo }) {
  const { stage, firstDay, differences } = stageInfo;
  
  // Helper function to format the difference display
  const formatDifference = (value: number | undefined) => {
    if (value === undefined) return '';
    if (value === 0) return '';
    return value > 0 ? ` (-${value})` : ` (+${Math.abs(value)})`;
  };
  
  return (
    <View style={styles.stageCard}>
      <Text style={styles.stageNumber}>Stage {stage}</Text>
      <View style={styles.metricsContainer}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Pouches</Text>
          <Text style={styles.metricValue}>
            {firstDay.pouches_allowed}
            <Text style={styles.diffText}>
              {formatDifference(differences?.pouches)}
            </Text>
          </Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Duration</Text>
          <Text style={styles.metricValue}>
            {firstDay.duration_per_pouch} min
            <Text style={styles.diffText}>
              {formatDifference(differences?.duration)}
            </Text>
          </Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Time Between</Text>
          <Text style={styles.metricValue}>
            {firstDay.time_between_pouches} min
            <Text style={styles.diffText}>
              {formatDifference(differences?.timeBetween)}
            </Text>
          </Text>
        </View>
      </View>
    </View>
  );
}

function LoadingDisplay() {
  return <Text style={styles.loadingText}>Loading...</Text>;
}

function ErrorDisplay({ error, onRetry }: { error: string, onRetry: () => void }) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>{error}</Text>
      <Text style={styles.retryText} onPress={onRetry}>
        Tap to retry
      </Text>
    </View>
  );
}

function ErrorFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.background}>
      <View style={styles.container}>
        <View style={styles.contentContainer}>
          <Text style={styles.errorText}>Something went wrong</Text>
          <Text style={styles.retryText} onPress={onRetry}>
            Tap to retry
          </Text>
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
    maxWidth: 800,
    alignSelf: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    color: '#666',
    textAlign: 'center',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 8,
  },
  loadingText: {
    fontSize: 18,
    color: '#888',
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#e74c3c',
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
    marginBottom: 10,
  },
  retryText: {
    fontSize: 16,
    color: '#3498db',
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
    textDecorationLine: 'underline',
  },
  stagesContainer: {
    width: '100%',
    marginTop: 30,
  },
  sectionTitle: {
    fontSize: 24,
    color: '#666',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 16,
    textAlign: 'left',
    width: '100%',
    paddingHorizontal: 10,
  },
  stagesScrollContent: {
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  stageCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginRight: 16,
    width: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  stageNumber: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 16,
  },
  metricsContainer: {
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  metricItem: {
    marginBottom: 16,
  },
  metricLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
  },
  diffText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Inter-Regular',
  },
});