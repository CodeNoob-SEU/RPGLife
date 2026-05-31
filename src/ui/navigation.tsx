import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors } from './theme';
import { TopStatusBar } from './components/TopStatusBar';
import { QuestsScreen } from './screens/QuestsScreen';
import { TrialsScreen } from './screens/TrialsScreen';
import { BossScreen } from './screens/BossScreen';
import { ShopScreen } from './screens/ShopScreen';
import { Placeholder } from './screens/Placeholder';

const Tab = createBottomTabNavigator();
const Settings = () => <Placeholder title="设置" />;

const ICON: Record<string, string> = { 委托: '📜', 试炼: '🎯', 讨伐: '👹', 商店: '🏪', 设置: '⚙️' };

export function RootNavigation() {
  return (
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
          <Tab.Screen name="商店" component={ShopScreen} />
          <Tab.Screen name="设置" component={Settings} />
        </Tab.Navigator>
      </View>
    </NavigationContainer>
  );
}
