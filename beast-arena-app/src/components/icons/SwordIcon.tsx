import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

export default function SwordIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14.5 3L21 9.5L19 11.5L18 10.5L15 13.5L13 15.5L10.5 18L3 21L6 13.5L8.5 11L10.5 9L13.5 6L12.5 5L14.5 3Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M3 21L9 15" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M14.5 3L21 9.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}
