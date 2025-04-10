import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native';
import { router } from 'expo-router';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { supabase } from '@/lib/supabase';

// Custom neumorphic checkbox component
type NeumorphicCheckboxProps = {
  label: string;
  checked: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
};

function NeumorphicCheckbox({ 
  label, 
  checked, 
  onValueChange,
  disabled = false
}: NeumorphicCheckboxProps) {
  return (
    <TouchableOpacity 
      style={styles.checkboxContainer} 
      onPress={() => !disabled && onValueChange(!checked)}
      disabled={disabled}
    >
      <View style={[
        styles.checkbox,
        checked && styles.checkboxChecked,
        disabled && styles.checkboxDisabled
      ]}>
        {checked && (
          <View style={styles.checkmark} />
        )}
      </View>
      <Text style={[
        styles.checkboxLabel,
        disabled && styles.textDisabled
      ]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function Preferences() {
  const [reduceTimePerPouch, setReduceTimePerPouch] = useState(false);
  const [increaseTimeBetween, setIncreaseTimeBetween] = useState(false);
  const [startLater, setStartLater] = useState(false);
  const [stopEarlier, setStopEarlier] = useState(false);
  const [noPreference, setNoPreference] = useState(false);
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

  const handleNoPreferenceChange = (value: boolean) => {
    if (value) {
      setReduceTimePerPouch(false);
      setIncreaseTimeBetween(false);
      setStartLater(false);
      setStopEarlier(false);
    }
    setNoPreference(value);
  };

  const handlePreferenceChange = (setter: (value: boolean) => void, value: boolean) => {
    if (value) {
      setNoPreference(false);
    }
    setter(value);
  };

  const handleSavePreferences = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      // Start a transaction by using multiple operations
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ has_completed_preferences: true })
        .eq('id', user.id);

      if (profileError) throw profileError;

      const { error: preferencesError } = await supabase
        .from('user_preferred_methods')
        .insert({
          user_id: user.id,
          reduce_time_per_pouch: reduceTimePerPouch,
          increase_time_between: increaseTimeBetween,
          start_later: startLater,
          stop_earlier: stopEarlier,
          no_preference: noPreference,
        });

      if (preferencesError) throw preferencesError;

      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => {
    return noPreference || reduceTimePerPouch || increaseTimeBetween || startLater || stopEarlier;
  };

  return (
    <View style={styles.background}>
      <View style={styles.container}>
        <View style={styles.contentContainer}>
          <Text style={styles.title}>Preferred Method</Text>
          <Text style={styles.subtitle}>How would you like to achieve your goal?</Text>
          
          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}
          
          <NeumorphicCheckbox
            label="Reduce Time per Pouch"
            checked={reduceTimePerPouch}
            onValueChange={(value) => handlePreferenceChange(setReduceTimePerPouch, value)}
            disabled={noPreference}
          />
          
          <NeumorphicCheckbox
            label="Increase Time Between Pouches"
            checked={increaseTimeBetween}
            onValueChange={(value) => handlePreferenceChange(setIncreaseTimeBetween, value)}
            disabled={noPreference}
          />
          
          <NeumorphicCheckbox
            label="Start Later in the Day"
            checked={startLater}
            onValueChange={(value) => handlePreferenceChange(setStartLater, value)}
            disabled={noPreference}
          />
          
          <NeumorphicCheckbox
            label="Stop Earlier in the Day"
            checked={stopEarlier}
            onValueChange={(value) => handlePreferenceChange(setStopEarlier, value)}
            disabled={noPreference}
          />
          
          <View style={styles.divider} />
          
          <NeumorphicCheckbox
            label="No Preference"
            checked={noPreference}
            onValueChange={handleNoPreferenceChange}
            disabled={reduceTimePerPouch || increaseTimeBetween || startLater || stopEarlier}
          />
          
          <TouchableOpacity 
            style={[styles.button, !isFormValid() && styles.buttonDisabled]} 
            onPress={handleSavePreferences}
            disabled={!isFormValid()}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Saving...' : 'Complete Setup'}
            </Text>
          </TouchableOpacity>
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
    fontSize: 32,
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
    marginBottom: 32,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F0F3',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '2px 2px 5px #D1D9E6, -2px -2px 5px #FFFFFF',
      }
    }),
  },
  checkboxChecked: {
    backgroundColor: '#F0F0F3',
  },
  checkmark: {
    width: 12,
    height: 12,
    borderRadius: 3,
    backgroundColor: '#00A3A3',
  },
  checkboxDisabled: {
    opacity: 0.5,
  },
  checkboxLabel: {
    color: '#666',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  textDisabled: {
    opacity: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: '#D1D9E6',
    width: '100%',
    marginVertical: 16,
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
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'Inter-Regular',
  },
});