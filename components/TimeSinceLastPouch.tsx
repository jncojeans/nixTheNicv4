import { StyleSheet, View, Text, Platform } from 'react-native';
import { useEffect, useState } from 'react';

type TimeSinceLastPouchProps = {
  lastPouchEndTime: string;
  timeBetweenPouches: number;
};

export function TimeSinceLastPouch({ 
  lastPouchEndTime,
  timeBetweenPouches,
}: TimeSinceLastPouchProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [remainingTime, setRemainingTime] = useState(timeBetweenPouches * 60);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const lastPouch = new Date(lastPouchEndTime).getTime();
      const elapsed = Math.floor((now - lastPouch) / 1000);
      setElapsedTime(elapsed);
      
      const remaining = (timeBetweenPouches * 60) - elapsed;
      setRemainingTime(remaining > 0 ? remaining : 0);
    }, 1000);

    return () => clearInterval(interval);
  }, [lastPouchEndTime, timeBetweenPouches]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  const progress = Math.min(elapsedTime / (timeBetweenPouches * 60), 1);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Time Since Last Pouch</Text>
      <View style={styles.timerContainer}>
        <Text style={styles.timerText}>{formatTime(elapsedTime)}</Text>
        <View style={styles.progressContainer}>
          <View 
            style={[
              styles.progressBar, 
              { 
                width: `${progress * 100}%`
              }
            ]} 
          />
        </View>
        <Text style={styles.remainingText}>
          {formatTime(remainingTime)} until next pouch
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    color: '#666',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 12,
  },
  timerContainer: {
    width: '100%',
    backgroundColor: '#F0F0F3',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
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
  timerText: {
    fontSize: 36,
    color: '#00A3A3',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 16,
  },
  progressContainer: {
    width: '100%',
    height: 6,
    backgroundColor: '#E0E0E3',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#00A3A3',
  },
  remainingText: {
    fontSize: 14,
    color: '#999',
    fontFamily: 'Inter-Regular',
  },
});