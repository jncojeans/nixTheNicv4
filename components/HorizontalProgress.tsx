import { StyleSheet, View, Text, Platform } from 'react-native';

type HorizontalProgressProps = {
  progress: number;
  duration: number;
  remainingTime: number;
};

const getProgressColor = (progress: number) => {
  if (progress <= 0.25) return '#ef4444'; // Red
  if (progress <= 0.2) return '#f97316'; // Orange
  if (progress <= 0.15) return '#eab308'; // Yellow
  return '#00A3A3'; // Default teal
};

export function HorizontalProgress({ 
  progress, 
  duration,
  remainingTime,
}: HorizontalProgressProps) {
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(Math.abs(seconds) / 60);
    const remainingSeconds = Math.abs(seconds) % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Calculate the time that has passed since the timer reached 0
  const timePassedSinceExpired = remainingTime <= 0 ? Math.abs(remainingTime) : 0;
  
  // Determine if the timer has expired
  const isExpired = remainingTime <= 0;
  
  // Set the display time (counts up if expired)
  const displayTime = isExpired ? timePassedSinceExpired : remainingTime;
  
  // Set the text to show
  const statusText = isExpired ? 'overtime' : 'remaining';

  return (
    <View style={styles.container}>
      <Text style={[
        styles.timeText, 
        isExpired && styles.expiredTimeText
      ]}>
        {formatTime(displayTime)}
      </Text>
      <Text style={[
        styles.remainingText,
        isExpired && styles.expiredRemainingText
      ]}>
        {statusText}
      </Text>
      <View style={styles.progressContainer}>
        <View 
          style={[
            styles.progressBar, 
            { 
              width: `${progress * 100}%`,
              backgroundColor: getProgressColor(progress)
            }
          ]} 
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#F0F0F3',
    borderRadius: 20,
    padding: 20,
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
  timeText: {
    fontSize: 48,
    fontFamily: 'Inter-SemiBold',
    color: '#00A3A3',
    marginBottom: 4,
  },
  expiredTimeText: {
    color: '#ef4444', // Red color for expired timer
  },
  remainingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#999',
    marginBottom: 20,
  },
  expiredRemainingText: {
    color: '#ef4444', // Red color for expired text
  },
  progressContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#E0E0E3',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
});