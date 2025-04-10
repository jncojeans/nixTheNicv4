import { Tabs } from 'expo-router';
import { Chrome as Home, Calendar as Plan, Settings } from 'lucide-react-native';
import { Platform } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#F0F0F3',
          borderTopWidth: 0,
          height: 75,
          paddingBottom: 18,
          paddingTop: 8,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -5 },
              shadowOpacity: 0.15,
              shadowRadius: 6,
            },
            android: {
              elevation: 8,
            },
            web: {
              boxShadow: '0px -5px 10px #D1D9E6, 0px 5px 10px #FFFFFF',
            }
          }),
        },
        tabBarActiveTintColor: '#00A3A3',
        tabBarInactiveTintColor: '#666',
        tabBarLabelStyle: {
          fontFamily: 'Inter-SemiBold',
          fontSize: 12,
          marginBottom: 10,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ size, color }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: 'Plan',
          tabBarIcon: ({ size, color }) => <Plan size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ size, color }) => <Settings size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}