import { ColorValue } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

type IconProps = { size?: number; color?: ColorValue };

export function CalendarIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round">
      <Rect x={3} y={4.5} width={18} height={16} rx={2.5} />
      <Path d="M3 9.5h18" />
      <Path d="M8 2.5v4" />
      <Path d="M16 2.5v4" />
    </Svg>
  );
}

export function MenuLinesIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round">
      <Path d="M4 6h16" />
      <Path d="M4 12h16" />
      <Path d="M4 18h10" />
    </Svg>
  );
}

export function BasketIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 4h2l2.2 12.2a2 2 0 002 1.8h8.2a2 2 0 002-1.7L21 8H6.2" />
      <Circle cx={9.5} cy={20.5} r={1.4} />
      <Circle cx={17.5} cy={20.5} r={1.4} />
    </Svg>
  );
}

export function HeartIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 20.2S3.6 15 3.6 9.4C3.6 6.4 5.8 4.4 8.4 4.4c1.8 0 3.1 1 3.6 2.3.5-1.3 1.8-2.3 3.6-2.3 2.6 0 4.8 2 4.8 5 0 5.6-8.4 10.8-8.4 10.8z" />
    </Svg>
  );
}

export function CheckIcon({ size = 14, color = 'white' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3}>
      <Path d="M4 12l5 5L20 6" />
    </Svg>
  );
}
