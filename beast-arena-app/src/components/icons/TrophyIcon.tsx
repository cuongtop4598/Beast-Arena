import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

export default function TrophyIcon({ size = 24, color = '#FFD700' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 2H18V8C18 11.31 15.31 14 12 14C8.69 14 6 11.31 6 8V2Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M6 4H3V6C3 7.66 4.34 9 6 9"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M18 4H21V6C21 7.66 19.66 9 18 9"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M12 14V17" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Rect x="8" y="17" width="8" height="3" rx="1" stroke={color} strokeWidth={1.8} />
      <Path d="M7 22H17" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}
