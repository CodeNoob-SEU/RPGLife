import { useFonts } from 'expo-font';
import { PressStart2P_400Regular } from '@expo-google-fonts/press-start-2p';

/** 加载像素字体；返回 [loaded, error]。App 在 hydrate + 字体就绪后再渲染主界面。 */
export function useAppFonts(): [boolean, Error | null] {
  return useFonts({
    PressStart2P_400Regular,
    Zpix: require('../../assets/fonts/Zpix.ttf'),
  });
}
