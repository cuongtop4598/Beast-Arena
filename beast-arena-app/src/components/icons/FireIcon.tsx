import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

export default function FireIcon({ size = 24, color = '#FF6B35' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2C10.5 5.5 6 8 6 13C6 16.31 8.69 19 12 19C15.31 19 18 16.31 18 13C18 8 13.5 5.5 12 2Z"
        fill={color}
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 19C10.34 19 9 17.66 9 16C9 13.5 12 11 12 11C12 11 15 13.5 15 16C15 17.66 13.66 19 12 19Z"
        fill="#FFD700"
        stroke="#FFD700"
        strokeWidth={1}
      />
    </Svg>
  );
}
