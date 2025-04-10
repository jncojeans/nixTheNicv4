import { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  Platform, 
  KeyboardAvoidingView, 
  ScrollView,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
  Modal,
  FlatList
} from 'react-native';
import { router } from 'expo-router';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as SplashScreen from 'expo-splash-screen';
import { supabase } from '@/lib/supabase';

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

const goalOptions = [
  { label: 'Quit', value: 'quit' },
  { label: 'Control my habit', value: 'control' },
];

// Neumorphic Dropdown Component
type NeumorphicDropdownProps = {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: { label: string; value: string }[];
  placeholder?: string;
};

function NeumorphicDropdown({ 
  label, 
  value, 
  onValueChange, 
  options,
  placeholder = 'Select an option'
}: NeumorphicDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(option => option.value === value);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleSelect = (selectedValue: string) => {
    onValueChange(selectedValue);
    setIsOpen(false);
  };

  return (
    <View style={styles.dropdownContainer}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity 
        style={styles.dropdownButton} 
        onPress={toggleDropdown}
        activeOpacity={0.8}
      >
        <Text style={styles.dropdownButtonText}>
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
      </TouchableOpacity>

      {Platform.OS === 'web' ? (
        isOpen && (
          <View style={styles.dropdownListContainer}>
            {options.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={styles.dropdownItem}
                onPress={() => handleSelect(option.value)}
              >
                <Text style={[
                  styles.dropdownItemText,
                  option.value === value && styles.dropdownItemTextSelected
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )
      ) : (
        <Modal
          visible={isOpen}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsOpen(false)}
        >
          <TouchableWithoutFeedback onPress={() => setIsOpen(false)}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <FlatList
                  data={options}
                  keyExtractor={(item) => item.value}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={() => handleSelect(item.value)}
                    >
                      <Text style={[
                        styles.dropdownItemText,
                        item.value === value && styles.dropdownItemTextSelected
                      ]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}
    </View>
  );
}

export default function Goal() {
  const [goalType, setGoalType] = useState('');
  const [targetDate, setTargetDate] = useState(new Date());
  const [timezone, setTimezone] = useState('');
  const [pouchesPerDay, setPouchesPerDay] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(Platform.OS === 'web');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Set default timezone based on user's system
    try {
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (userTimezone) {
        setTimezone(userTimezone);
      }
    } catch (err) {
      console.warn('Error getting user timezone:', err);
    }
  }, []);

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

  if (!fontsLoaded && !fontError) {
    return <View style={styles.background} />;
  }

  const handleGoalTypeChange = (value: string) => {
    setGoalType(value);
    // Reset pouches per day if switching from control to quit
    if (value !== 'control') {
      setPouchesPerDay('');
    }
  };

  const handlePouchesPerDayChange = (text: string) => {
    // Only allow numeric input
    if (/^\d*$/.test(text)) {
      setPouchesPerDay(text);
    }
  };

  const handleTimezoneChange = (value: string) => {
    setTimezone(value);
  };

  const handleSaveGoal = async () => {
    try {
      // Validate inputs
      if (!goalType) {
        setError('Please select a goal type');
        return;
      }

      if (!timezone) {
        setError('Please select your timezone');
        return;
      }

      if (goalType === 'control' && (!pouchesPerDay || parseInt(pouchesPerDay) <= 0)) {
        setError('Please enter a valid number of pouches per day');
        return;
      }

      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      // Update profile with timezone
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ 
          timezone,
          has_completed_goal: true 
        })
        .eq('id', user.id);

      if (profileUpdateError) throw profileUpdateError;

      // Create user goal
      const { error: goalError } = await supabase
        .from('user_goals')
        .insert({
          user_id: user.id,
          goal_type: goalType,
          target_date: targetDate.toISOString().split('T')[0],
          pouches_per_day: goalType === 'control' ? Number(pouchesPerDay) : null,
        });

      if (goalError) throw goalError;

      router.push('/onboarding/habits');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    // Always hide the picker after selection on mobile
    setShowDatePicker(false);
    
    if (selectedDate) {
      setTargetDate(selectedDate);
    }
  };

  const showDatePickerModal = () => {
    setShowDatePicker(true);
  };

  const isFormValid = goalType && timezone && (goalType !== 'control' || (pouchesPerDay && parseInt(pouchesPerDay) > 0));

  return (
    <KeyboardAvoidingView 
      style={styles.background}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            <View style={styles.contentContainer}>
              <Text style={styles.title}>Set Your Goal</Text>
              <Text style={styles.subtitle}>Let's establish your journey's destination</Text>
              
              {error && (
                <Text style={styles.errorText}>{error}</Text>
              )}
              
              <NeumorphicDropdown
                label="What is your goal?"
                value={goalType}
                onValueChange={handleGoalTypeChange}
                options={goalOptions}
                placeholder="Select your goal"
              />
              
              <View style={styles.dateContainer}>
                <Text style={styles.label}>When will you achieve your goal?</Text>
                {Platform.OS === 'web' ? (
                  <View style={styles.dateInputContainer}>
                    <input
                      type="date"
                      value={targetDate.toISOString().split('T')[0]}
                      onChange={(e) => setTargetDate(new Date(e.target.value))}
                      style={{
                        color: '#666',
                        fontSize: 16,
                        fontFamily: 'Inter-Regular',
                        backgroundColor: 'transparent',
                        border: 'none',
                        width: '100%',
                        outline: 'none',
                      }}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </View>
                ) : (
                  <>
                    {!showDatePicker ? (
                      <TouchableOpacity onPress={showDatePickerModal}>
                        <View style={styles.dateInputContainer}>
                          <Text style={styles.dateText}>
                            {targetDate.toLocaleDateString()}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ) : (
                      <DateTimePicker
                        value={targetDate}
                        mode="date"
                        display="spinner"
                        onChange={handleDateChange}
                        minimumDate={new Date()}
                        textColor="#333"
                      />
                    )}
                  </>
                )}
              </View>
              
              <NeumorphicDropdown
                label="Your timezone"
                value={timezone}
                onValueChange={handleTimezoneChange}
                options={commonTimezones}
                placeholder="Select your timezone"
              />
              
              {goalType === 'control' && (
                <View style={styles.inputWrapper}>
                  <Text style={styles.label}>Pouches per Day</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      value={pouchesPerDay}
                      onChangeText={handlePouchesPerDayChange}
                      placeholder="Enter number of pouches"
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              )}
              
              <TouchableOpacity 
                style={[styles.button, !isFormValid && styles.buttonDisabled]} 
                onPress={handleSaveGoal}
                disabled={!isFormValid}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Saving...' : 'Continue'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#F0F0F3',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    minHeight: '100%',
  },
  contentContainer: {
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F0F3',
    borderRadius: 30,
    padding: 24,
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
  title: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  dateContainer: {
    marginBottom: 16,
    width: '100%',
  },
  inputWrapper: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    color: '#666',
    marginBottom: 8,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
  dateInputContainer: {
    backgroundColor: '#F0F0F3',
    borderRadius: 12,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 5, height: 5 },
        shadowOpacity: 0.15,
        shadowRadius: 5,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: 'inset 2px 2px 5px #D1D9E6, inset -2px -2px 5px #FFFFFF',
      }
    }),
  },
  inputContainer: {
    backgroundColor: '#F0F0F3',
    borderRadius: 12,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 5, height: 5 },
        shadowOpacity: 0.15,
        shadowRadius: 5,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: 'inset 2px 2px 5px #D1D9E6, inset -2px -2px 5px #FFFFFF',
      }
    }),
  },
  input: {
    color: '#666',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    width: '100%',
    ...(Platform.OS === 'web' ? {
      outlineStyle: 'none',
      backgroundColor: 'transparent',
      border: 'none',
    } : {}),
  },
  dateText: {
    color: '#333',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  button: {
    backgroundColor: '#F0F0F3',
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    width: '100%',
    marginTop: 24,
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
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#00A3A3',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  errorText: {
    color: '#ef4444',
    marginBottom: 16,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  // Dropdown styles
  dropdownContainer: {
    marginBottom: 16,
    width: '100%',
  },
  dropdownButton: {
    backgroundColor: '#F0F0F3',
    borderRadius: 12,
    padding: 16,
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 5, height: 5 },
        shadowOpacity: 0.15,
        shadowRadius: 5,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: 'inset 2px 2px 5px #D1D9E6, inset -2px -2px 5px #FFFFFF',
      }
    }),
  },
  dropdownButtonText: {
    color: '#666',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  dropdownListContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#F0F0F3',
    borderRadius: 12,
    marginTop: 8,
    zIndex: 1000,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 5, height: 5 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: '5px 5px 10px #D1D9E6, -5px -5px 10px #FFFFFF',
      }
    }),
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    maxHeight: '70%',
    backgroundColor: '#F0F0F3',
    borderRadius: 20,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 10, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  dropdownItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  dropdownItemText: {
    color: '#666',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  dropdownItemTextSelected: {
    color: '#00A3A3',
    fontFamily: 'Inter-SemiBold',
  },
});