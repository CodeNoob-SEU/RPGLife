import { useState } from 'react';
import { View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, runOnJS, Easing } from 'react-native-reanimated';
import { colors, space } from '../theme';
import { PixelText } from './Pixel';

export function useGainFloat() {
  const [text, setText] = useState<string | null>(null);
  const y = useSharedValue(0);
  const opacity = useSharedValue(0);

  const clear = () => setText(null);
  const fire = (t: string) => {
    setText(t);
    y.value = 0;
    opacity.value = 0;
    opacity.value = withSequence(withTiming(1, { duration: 150 }), withTiming(0, { duration: 650, easing: Easing.in(Easing.quad) }, (fin) => { if (fin) runOnJS(clear)(); }));
    y.value = withTiming(-space(10), { duration: 800, easing: Easing.out(Easing.quad) });
  };

  const aStyle = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: y.value }] }));

  const floatNode = text ? (
    <View pointerEvents="none" style={{ position: 'absolute', top: space(2), left: 0, right: 0, alignItems: 'center', zIndex: 10 }}>
      <Animated.View style={aStyle}>
        <PixelText style={{ color: colors.gold, fontWeight: 'bold', fontSize: 18 }}>{text}</PixelText>
      </Animated.View>
    </View>
  ) : null;

  return { floatNode, fire };
}
