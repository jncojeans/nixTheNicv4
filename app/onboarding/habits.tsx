import { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  Platform, 
  KeyboardAvoidingView, 
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
  TextInput
} from 'react-native';
import { router } from 'expo-router';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as SplashScreen from 'expo-splash-screen';
import { supabase } from '@/lib/supabase';

export default function Habits() {
  const [pouchMgs, setPouchMgs] = useState('');
  const [firstPouchTime, setFirstPouchTime] = useState(new Date());
  const [pouchesPerDay, setPouchesPerDay] = useState('');
  const [durationPerPouch, setDurationPerPouch] = useState('');
  const [timeBetweenPouches, setTimeBetweenPouches] = useState('');
  const [lastPouchTime, setLastPouchTime] = useState(new Date());
  const [showFirstPouchPicker, setShowFirstPouchPicker] = useState(Platform.OS === 'web');
  const [showLastPouchPicker, setShowLastPouchPicker] = useState(Platform.OS === 'web');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleSaveHabits = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      // Start a transaction by using multiple operations
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ has_completed_habits: true })
        .eq('id', user.id);

      if (profileError) throw profileError;

      const { error: habitsError } = await supabase
        .from('current_habits')
        .insert({
          user_id: user.id,
          pouch_mgs: Number(pouchMgs),
          first_pouch_time: firstPouchTime.toLocaleTimeString('en-US', { hour12: false }),
          pouches_per_day: Number(pouchesPerDay),
          duration_per_pouch: Number(durationPerPouch),
          time_between_pouches: Number(timeBetweenPouches),
          last_pouch_time: lastPouchTime.toLocaleTimeString('en-US', { hour12: false }),
        });

      if (habitsError) throw habitsError;

      router.replace('/onboarding/preferences');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleFirstPouchTimeChange = (event: any, selectedDate?: Date) => {
    // Always hide the picker after selection
    setShowFirstPouchPicker(false);
    
    if (selectedDate) {
      setFirstPouchTime(selectedDate);
    }
  };

  const handleLastPouchTimeChange = (event: any, selectedDate?: Date) => {
    // Always hide the picker after selection
    setShowLastPouchPicker(false);
    
    if (selectedDate) {
      setLastPouchTime(selectedDate);
    }
  };

  const isFormValid = () => {
    return (
      pouchMgs &&
      pouchesPerDay &&
      durationPerPouch &&
      timeBetweenPouches &&
      firstPouchTime < lastPouchTime
    );
  };

  // Function to dismiss keyboard when tapping outside inputs
  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <KeyboardAvoidingView
      style={styles.background}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            <View style={styles.contentContainer}>
              <Text style={styles.title}>Current Habits</Text>
              <Text style={styles.subtitle}>Help us understand your current usage</Text>
              
              {error && (
                <Text style={styles.errorText}>{error}</Text>
              )}
              
              <View style={styles.inputWrapper}>
                <Text style={styles.label}>Pouch MGs</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={pouchMgs}
                    onChangeText={setPouchMgs}
                    placeholder="Enter MGs per pouch"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.timeContainer}>
                <Text style={styles.label}>First Pouch of the Day</Text>
                {Platform.OS === 'web' ? (
                  <View style={styles.timeInputContainer}>
                    <input
                      type="time"
                      value={firstPouchTime.toLocaleTimeString('en-US', { hour12: false }).slice(0, 5)}
                      onChange={(e) => setFirstPouchTime(new Date(`2000-01-01T${e.target.value}`))}
                      style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: '#333',
                        fontSize: 16,
                        fontFamily: 'Inter-Regular',
                        width: '100%',
                        outline: 'none',
                      }}
                    />
                  </View>
                ) : (
                  <>
                    {!showFirstPouchPicker ? (
                      <TouchableOpacity onPress={() => setShowFirstPouchPicker(true)}>
                        <View style={styles.timeInputContainer}>
                          <Text style={styles.timeText}>
                            {firstPouchTime.toLocaleTimeString()}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ) : (
                      <DateTimePicker
                        value={firstPouchTime}
                        mode="time"
                        display="spinner"
                        onChange={handleFirstPouchTimeChange}
                        textColor="#333"
                      />
                    )}
                  </>
                )}
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.label}>Pouches per Day</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={pouchesPerDay}
                    onChangeText={setPouchesPerDay}
                    placeholder="Enter number of pouches"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.label}>Duration per Pouch (minutes)</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={durationPerPouch}
                    onChangeText={setDurationPerPouch}
                    placeholder="Enter duration"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.label}>Time Between Pouches (minutes)</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={timeBetweenPouches}
                    onChangeText={setTimeBetweenPouches}
                    placeholder="Enter time between pouches"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.timeContainer}>
                <Text style={styles.label}>Last Pouch of the Day</Text>
                {Platform.OS === 'web' ? (
                  <View style={styles.timeInputContainer}>
                    <input
                      type="time"
                      value={lastPouchTime.toLocaleTimeString('en-US', { hour12: false }).slice(0, 5)}
                      onChange={(e) => setLastPouchTime(new Date(`2000-01-01T${e.target.value}`))}
                      style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: '#333',
                        fontSize: 16,
                        fontFamily: 'Inter-Regular',
                        width: '100%',
                        outline: 'none',
                      }}
                    />
                  </View>
                ) : (
                  <>
                    {!showLastPouchPicker ? (
                      <TouchableOpacity onPress={() => setShowLastPouchPicker(true)}>
                        <View style={styles.timeInputContainer}>
                          <Text style={styles.timeText}>
                            {lastPouchTime.toLocaleTimeString()}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ) : (
                      <DateTimePicker
                        value={lastPouchTime}
                        mode="time"
                        display="spinner"
                        onChange={handleLastPouchTimeChange}
                        textColor="#333"
                      />
                    )}
                  </>
                )}
              </View>

              <TouchableOpacity 
                style={[styles.button, !isFormValid() && styles.buttonDisabled]} 
                onPress={handleSaveHabits}
                disabled={!isFormValid()}
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
    paddingVertical: 20,
  },
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
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
    fontSize: 28,
    color: '#666',
    textAlign: 'center',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
    marginBottom: 24,
  },
  inputWrapper: {
    marginBottom: 16,
    width: '100%',
  },
  timeContainer: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    color: '#666',
    marginBottom: 8,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
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
  timeInputContainer: {
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
    color: '#333',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    width: '100%',
    ...(Platform.OS === 'web' ? {
      outlineStyle: 'none',
      backgroundColor: 'transparent',
      border: 'none',
    } : {}),
  },
  timeText: {
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
});