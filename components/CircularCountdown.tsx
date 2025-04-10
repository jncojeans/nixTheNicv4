import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { StyleSheet, View, Text, useWindowDimensions, Platform } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

type TimeUnit = {
  value: number;
  label: string;
  total: number;
};

type CircularCountdownProps = {
  quitDate: string;
};

export function CircularCountdown({ quitDate }: CircularCountdownProps) {
  const [timeUnits, setTimeUnits] = useState<TimeUnit[]>([]);
  const { width } = useWindowDimensions();
  
  const isSmallScreen = width < 768;
  
  // Memoize dimension calculations to prevent recalculation on every render
  const dimensions = useMemo(() => {
    const containerPadding = 20;
    const gap = 16;
    const availableWidth = Math.min(width - (containerPadding * 2), 800);
    // Apply a size reduction factor to make circles smaller (0.85 = 85% of original size)
    const sizeReductionFactor = 0.85;
    const ringSize = ((availableWidth - (gap * 3)) / 4) * sizeReductionFactor;
    
    return {
      containerPadding,
      gap,
      availableWidth,
      ringSize
    };
  }, [width]);
  
  // Memoize the calculation function to prevent recreation on every render
  const calculateTimeUnits = useCallback(() => {
    try {
      const now = new Date().getTime();
      const quit = new Date(quitDate).getTime();
      
      // Handle case where quit date is in the past
      if (quit <= now) {
        setTimeUnits([
          { value: 0, label: 'Days', total: 1 },
          { value: 0, label: 'Hours', total: 24 },
          { value: 0, label: 'Min.', total: 60 },
          { value: 0, label: 'Sec.', total: 60 },
        ]);
        return;
      }
      
      const distance = quit - now;

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      // Calculate total days only once
      const totalDays = Math.max(1, Math.ceil((quit - new Date(quitDate).getTime()) / (1000 * 60 * 60 * 24)));

      setTimeUnits([
        { value: days, label: 'Days', total: totalDays },
        { value: hours, label: 'Hours', total: 24 },
        { value: minutes, label: 'Min.', total: 60 },
        { value: seconds, label: 'Sec.', total: 60 },
      ]);
    } catch (error) {
      console.error('Error calculating time units:', error);
      // Set default values in case of error
      setTimeUnits([
        { value: 0, label: 'Days', total: 1 },
        { value: 0, label: 'Hours', total: 24 },
        { value: 0, label: 'Min.', total: 60 },
        { value: 0, label: 'Sec.', total: 60 },
      ]);
    }
  }, [quitDate]);

  useEffect(() => {
    // Calculate immediately on mount
    calculateTimeUnits();
    
    // Use requestAnimationFrame for better performance on web
    let animationFrameId: number | null = null;
    let lastUpdateTime = Date.now();
    
    // Set up interval with a slightly longer duration to reduce CPU usage
    const interval = setInterval(() => {
      if (Platform.OS === 'web') {
        // On web, use requestAnimationFrame for smoother updates
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
        
        animationFrameId = requestAnimationFrame(() => {
          // Only update if at least 1 second has passed
          const now = Date.now();
          if (now - lastUpdateTime >= 1000) {
            calculateTimeUnits();
            lastUpdateTime = now;
          }
        });
      } else {
        // On native, just use the interval
        calculateTimeUnits();
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      if (animationFrameId && Platform.OS === 'web') {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [calculateTimeUnits]);

  // Memoize the CountdownRing components to prevent unnecessary re-renders
  const countdownRings = useMemo(() => {
    return timeUnits.map((unit, index) => (
      <View key={unit.label} style={[
        styles.ringWrapper,
        { marginRight: index < 3 ? dimensions.gap : 0, width: dimensions.ringSize }
      ]}>
        <CountdownRing
          size={dimensions.ringSize}
          strokeWidth={dimensions.ringSize * 0.1}
          progress={unit.value / unit.total}
          value={unit.value}
        />
        <Text style={styles.labelText}>{unit.label}</Text>
      </View>
    ));
  }, [timeUnits, dimensions]);

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>Time to nicotine free</Text>
      <View style={[
        styles.ringsContainer,
        { flexDirection: 'row' }
      ]}>
        {countdownRings}
      </View>
    </View>
  );
}

// Memoize the CountdownRing component to prevent unnecessary re-renders
const CountdownRing = React.memo(({ 
  size, 
  strokeWidth, 
  progress, 
  value, 
  style
}: CountdownRingProps) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progressOffset = circumference - (Math.max(0, Math.min(1, progress)) * circumference);

  return (
    <View style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        {/* Background circle */}
        <Circle
          stroke="#E0E0E3"
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <Circle
          stroke="#00A3A3"
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={progressOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[styles.valueContainer, { width: size, height: size }]}>
        <Text style={[styles.valueText, { fontSize: size * 0.25 }]}>{value}</Text>
      </View>
    </View>
  );
});

type CountdownRingProps = {
  size: number;
  strokeWidth: number;
  progress: number;
  value: number;
  style?: any;
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#F0F0F3',
    borderRadius: 30,
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
  subtitle: {
    fontSize: 18,
    color: '#999',
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
    marginBottom: 32,
  },
  ringsContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'nowrap',
  },
  ringWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: {
    color: '#00A3A3',
    fontFamily: 'Inter-SemiBold',
  },
  labelText: {
    color: '#666',
    fontFamily: 'Inter-Regular',
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
    width: '100%',
  },
});