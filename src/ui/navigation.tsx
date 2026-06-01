import { Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors } from './theme';
import { TopStatusBar } from './components/TopStatusBar';
import { CelebrationOverlay } from './components/CelebrationOverlay';
import { MorningReport } from './components/MorningReport';
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
              // 单行 emoji+文字标签。react-navigation 的 below-icon 布局把按钮容器写死成
              // justifyContent:'flex-start'（tabBarItemStyle 覆盖不到内层按钮），且即使不设
              // tabBarIcon 仍会渲染一个默认图标槽位占住上半行 —— 两者叠加导致标签沉底。
              // 解法：①隐藏图标槽位 ②label 用一个 flex:1 居中 View 撑满并居中文字（web/原生一致）。
              tabBarIconStyle: { display: 'none' },
              tabBarLabel: ({ color }) => (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color, fontSize: 10 }}>{`${ICON[route.name] ?? ''} ${route.name}`}</Text>
                </View>
              ),
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
      <MorningReport />
    </View>
  );
}
