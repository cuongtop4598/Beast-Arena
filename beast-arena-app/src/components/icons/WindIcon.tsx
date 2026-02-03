import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

export default function WindIcon({ size = 24, color = '#9370DB' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9.59 4.59C10.21 3.97 11.06 3.62 11.95 3.62C13.8 3.62 15.3 5.12 15.3 6.97C15.3 8.82 13.8 10.32 11.95 10.32H2"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12.59 19.41C13.21 20.03 14.06 20.38 14.95 20.38C16.8 20.38 18.3 18.88 18.3 17.03C18.3 15.18 16.8 13.68 14.95 13.68H2"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M17.73 7.73C18.13 7.33 18.67 7.1 19.24 7.1C20.42 7.1 21.37 8.05 21.37 9.23C21.37 10.41 20.42 11.36 19.24 11.36H2"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
