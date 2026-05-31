import { Platform, ViewStyle } from 'react-native';

export const colors = {
  bgDeep: '#1a1c2c',
  bgPanel: '#2b2f4a',
  panelHi: '#3a3f63', // 高亮/选中态面板
  ink: '#f4f4f4',
  textDim: '#9aa0c0', // 次要文字 / 占位符 / 空状态（对比 ≥4.5:1）
  gold: '#f7c948',
  exp: '#5fcde4',
  success: '#6abe30',
  danger: '#d34b4b',
  accent: '#ef7d57',
  border: '#0d0e1a',
};

export const space = (n: number) => n * 4;
export const radius = 0; // 像素风：无圆角

/** 字号阶。Press Start 2P 仅在 8 的倍数清晰（display 用）；中文走 Zpix 不受限。 */
export const fontSizes = { tiny: 11, small: 13, body: 14, title: 16, hero: 20 };

/** 像素硬边框（无圆角）。 */
export const pixelBorder = {
  borderWidth: 3,
  borderColor: colors.border,
};

/**
 * 像素硬投影（无模糊）。web 用 `boxShadow`（RN-web 已弃用 shadow 系列样式，旧写法刷告警），
 * 原生仍用 shadowColor/Offset/Opacity/Radius + elevation。
 */
export const pixelShadow = Platform.select({
  web: { boxShadow: `${space(1)}px ${space(1)}px 0px ${colors.border}` },
  default: {
    shadowColor: colors.border,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
}) as ViewStyle;

/** 字体族：body=Zpix（覆盖中英数像素字形）；display=Press Start 2P（仅英文/数字大标题，无 CJK）。 */
export const font = {
  body: 'Zpix' as string | undefined,
  display: 'PressStart2P_400Regular',
};
