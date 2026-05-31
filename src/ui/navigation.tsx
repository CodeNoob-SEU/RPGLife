import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors } from './theme';
import { TopStatusBar } from './components/TopStatusBar';
import { CelebrationOverlay } from './components/CelebrationOverlay';
import { QuestsScreen } from './screens/QuestsScreen';
import { TrialsScreen } from './screens/TrialsScreen';
import { BossScreen } from './screens/BossScreen';
import { DataScreen } from './screens/DataScreen';
import { ShopScreen } from './screens/ShopScreen';
import { SettingsScreen } from './screens/SettingsScreen';

const Tab = createBottomTabNavigator();
const ICON: Record<string, string> = { 委托: '📜', 试炼: '🎯', 讨伐: '👹', 数据: '📊', 商店: '🏪', 设置: '⚙️' };

export function RootNavigation() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgDeep }}>
      <NavigationContainer>
        <View style={{ flex: 1, backgroundColor: colors.bgDeep }}>
          <TopStatusBar />
          <Tab.Navigator
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarStyle: { backgroundColor: colors.bgPanel, borderTopWidth: 3, borderTopColor: colors.border },
              tabBarActiveTintColor: colors.gold,
              tabBarInactiveTintColor: colors.ink,
              tabBarIcon: () => null,
              tabBarLabel: `${ICON[route.name] ?? ''} ${route.name}`,
            })}
          >
            <Tab.Screen name="委托" component={QuestsScreen} />
            <Tab.Screen name="试炼" component={TrialsScreen} />
            <Tab.Screen name="讨伐" component={BossScreen} />
            <Tab.Screen name="数据" component={DataScreen} />
            <Tab.Screen name="商店" component={ShopScreen} />
            <Tab.Screen name="设置" component={SettingsScreen} />
          </Tab.Navigator>
        </View>
      </NavigationContainer>
      <CelebrationOverlay />
    </View>
  );
}
