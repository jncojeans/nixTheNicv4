import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';
import { GlassContainer } from './GlassContainer';
import { Picker } from '@react-native-picker/picker';

type Option = {
  label: string;
  value: string;
};

type CustomSelectProps = {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
};

export function CustomSelect({ 
  label, 
  value, 
  onValueChange, 
  options,
  placeholder = 'Select an option'
}: CustomSelectProps) {
  const [selectedValue, setSelectedValue] = useState(value || '');

  // Update internal state when external value changes
  useEffect(() => {
    if (value !== selectedValue) {
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
        <Text style={styles.label}>{label}</Text>
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
            <option value="" disabled>{placeholder}</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
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
      <Text style={styles.label}>{label}</Text>
      <GlassContainer style={styles.selectContainer}>
        <Picker
          selectedValue={selectedValue}
          onValueChange={handleValueChange}
          style={styles.picker}
          dropdownIconColor="#fff"
          mode="dropdown"
        >
          <Picker.Item label={placeholder} value="" enabled={false} />
          {options.map((option) => (
            <Picker.Item key={option.value} label={option.label} value={option.value} />
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