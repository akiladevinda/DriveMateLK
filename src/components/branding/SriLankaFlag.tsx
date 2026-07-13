import Svg, { Rect } from 'react-native-svg';

type SriLankaFlagProps = {
  width?: number;
  height?: number;
};

/** Compact Sri Lankan flag mark for splash / branding footers. */
export function SriLankaFlag({ width = 28, height = 18 }: SriLankaFlagProps) {
  const border = 1.2;
  const stripeW = (width - border * 2) * 0.18;
  const innerX = border;
  const innerY = border;
  const innerH = height - border * 2;
  const maroonX = innerX + stripeW * 2;
  const maroonW = width - border * 2 - stripeW * 2;

  return (
    <Svg
      accessibilityLabel="Sri Lanka flag"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
    >
      {/* Yellow border */}
      <Rect x={0} y={0} width={width} height={height} rx={2} fill="#FFB300" />
      {/* Orange stripe (hoist) */}
      <Rect x={innerX} y={innerY} width={stripeW} height={innerH} fill="#EB7400" />
      {/* Green stripe */}
      <Rect
        x={innerX + stripeW}
        y={innerY}
        width={stripeW}
        height={innerH}
        fill="#00563F"
      />
      {/* Maroon field */}
      <Rect x={maroonX} y={innerY} width={maroonW} height={innerH} fill="#8D1C1C" />
      {/* Simplified lion disc */}
      <Rect
        x={maroonX + maroonW * 0.28}
        y={innerY + innerH * 0.22}
        width={maroonW * 0.44}
        height={innerH * 0.56}
        rx={2}
        fill="#FFB300"
      />
    </Svg>
  );
}
