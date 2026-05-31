export const colors = {
  bgDeep: '#1a1c2c',
  bgPanel: '#2b2f4a',
  ink: '#f4f4f4',
  gold: '#f7c948',
  exp: '#5fcde4',
  success: '#6abe30',
  danger: '#d34b4b',
  accent: '#ef7d57',
  border: '#0d0e1a',
};

export const space = (n: number) => n * 4;
export const radius = 0; // 像素风：无圆角

/** 像素硬边框 + 硬投影（无模糊）。 */
export const pixelBorder = {
  borderWidth: 3,
  borderColor: colors.border,
};
export const pixelShadow = {
  shadowColor: colors.border,
  shadowOffset: { width: 4, height: 4 },
  shadowOpacity: 1,
  shadowRadius: 0,
  elevation: 4,
};
