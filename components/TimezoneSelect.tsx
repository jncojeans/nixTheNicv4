import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Platform, Pressable } from 'react-native';
import { GlassContainer } from './GlassContainer';
import { Picker } from '@react-native-picker/picker';

type TimezoneSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
};

// Common timezones that work across all platforms
const commonTimezones = [
  { label: 'Pacific/Honolulu (Hawaii)', value: 'Pacific/Honolulu' },
  { label: 'America/Anchorage (Alaska)', value: 'America/Anchorage' },
  { label: 'America/Los_Angeles (Pacific Time)', value: 'America/Los_Angeles' },
  { label: 'America/Phoenix (Arizona)', value: 'America/Phoenix' },
  { label: 'America/Denver (Mountain Time)', value: 'America/Denver' },
  { label: 'America/Chicago (Central Time)', value: 'America/Chicago' },
  { label: 'America/New_York (Eastern Time)', value: 'America/New_York' },
  { label: 'America/Halifax (Atlantic Time)', value: 'America/Halifax' },
  { label: 'America/St_Johns (Newfoundland)', value: 'America/St_Johns' },
  { label: 'Europe/London (GMT/UTC)', value: 'Europe/London' },
  { label: 'Europe/Paris (Central European Time)', value: 'Europe/Paris' },
  { label: 'Europe/Helsinki (Eastern European Time)', value: 'Europe/Helsinki' },
  { label: 'Asia/Dubai (Gulf Standard Time)', value: 'Asia/Dubai' },
  { label: 'Asia/Kolkata (India)', value: 'Asia/Kolkata' },
  { label: 'Asia/Singapore (Singapore)', value: 'Asia/Singapore' },
  { label: 'Asia/Tokyo (Japan)', value: 'Asia/Tokyo' },
  { label: 'Australia/Sydney (Eastern Australia)', value: 'Australia/Sydney' },
  { label: 'Pacific/Auckland (New Zealand)', value: 'Pacific/Auckland' },
];

export function TimezoneSelect({ value, onValueChange }: TimezoneSelectProps) {
  const [selectedValue, setSelectedValue] = useState(value || '');
  
  // Set default timezone if none is provided
  useEffect(() => {
    if (!selectedValue) {
      try {
        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (userTimezone) {
          const found = commonTimezones.find(tz => tz.value === userTimezone);
          if (found) {
            setSelectedValue(found.value);
            onValueChange(found.value);
          } else {
            // Default to a common timezone if user's timezone isn't in our list
            setSelectedValue('America/New_York');
            onValueChange('America/New_York');
          }
        }
      } catch (error) {
        console.warn('Error setting default timezone:', error);
        // Default fallback
        setSelectedValue('America/New_York');
        onValueChange('America/New_York');
      }
    }
  }, []);

  // Update internal state when external value changes
  useEffect(() => {
    if (value && value !== selectedValue) {
      setSelectedValue(value);
    }
  }, [value]);

  // Handle value change from picker
  const handleValueChange = (newValue: string) => {
    setSelectedValue(newValue);
    onValueChange(newValue);
  };

  // Render a simple select element for web
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>Your Timezone</Text>
        <GlassContainer style={styles.selectContainer}>
          <select
            value={selectedValue}
            onChange={(e) => handleValueChange(e.target.value)}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: '#fff',
              fontSize: 16,
              fontFamily: 'Inter-Regular',
              width: '100%',
              outline: 'none',
              appearance: 'none',
              paddingRight: 20, // Space for the dropdown arrow
            }}
          >
            <option value="" disabled>Select your timezone</option>
            {commonTimezones.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </GlassContainer>
      </View>
    );
  }

  // For native platforms, use the Picker component directly
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Your Timezone</Text>
      <GlassContainer style={styles.selectContainer}>
        <Picker
          selectedValue={selectedValue}
          onValueChange={handleValueChange}
          style={styles.picker}
          dropdownIconColor="#fff"
          mode="dropdown"
        >
          <Picker.Item label="Select your timezone" value="" enabled={false} />
          {commonTimezones.map((tz) => (
            <Picker.Item key={tz.value} label={tz.label} value={tz.value} />
          ))}
        </Picker>
      </GlassContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    color: '#fff',
    marginBottom: 8,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
  selectContainer: {
    padding: Platform.OS === 'web' ? 12 : 8,
  },
  picker: {
    color: '#fff',
    width: '100%',
    height: Platform.OS === 'ios' ? 120 : 40,
    backgroundColor: 'transparent',
  },
});