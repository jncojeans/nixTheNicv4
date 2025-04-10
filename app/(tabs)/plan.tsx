import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { CircularCountdown } from '@/components/CircularCountdown';
import { supabase } from '@/lib/supabase';
import * as SplashScreen from 'expo-splash-screen';
import { Platform } from 'react-native';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function Plan() {
  const [quitDate, setQuitDate] = useState<string | null>(null);
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

  // Memoize the fetchQuitDate function to prevent recreation on every render
  const fetchQuitDate = useCallback(async () => {
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
        .select('quit_date')
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
      setError(null);
    } catch (err) {
      console.error('Error fetching quit date:', err);
      
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
    fetchQuitDate();
    
    // Clean up function
    return () => {
      // Cancel any pending operations if needed
    };
  }, [fetchQuitDate]);

  const handleRetry = () => {
    setError(null);
    setRetryCount(0);
    fetchQuitDate();
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
              <PlanContent quitDate={quitDate} />
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
function PlanContent({ quitDate }: { quitDate: string }) {
  return (
    <>
      <Text style={styles.title}>Your Journey</Text>
      <CircularCountdown quitDate={quitDate} />
    </>
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
  errorContainer: {
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'Inter-Regular',
  },
  retryText: {
    color: '#00A3A3',
    textAlign: 'center',
    fontFamily: 'Inter-SemiBold',
    padding: 8,
  },
  loadingText: {
    color: '#666',
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
  },
});