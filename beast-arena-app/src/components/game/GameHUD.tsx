import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

// --- Types ---

interface FighterHUDData {
  characterEmoji: string;
  name: string;
  hp: number;
  maxHp: number;
  ultGauge: number; // 0-100
  buffs: string[]; // emoji array
}

interface ComboData {
  hits: number;
  totalDamage: number;
  isActive: boolean;
}

interface GameHUDProps {
  player1: FighterHUDData;
  player2: FighterHUDData;
  timer: number;
  round: number;
  roundResults: Array<{ winnerId: string }>;
  player1Id: string;
  player2Id: string;
  roundsToWin: number;
  combo: ComboData | null;
}

// --- HP Bar Component ---

const HPBar: React.FC<{
  fighter: FighterHUDData;
  side: 'left' | 'right';
  ultGauge: number;
}> = ({ fighter, side, ultGauge }) => {
  const hpAnim = useRef(new Animated.Value(fighter.hp / fighter.maxHp)).current;
  const hpPercent = fighter.hp / fighter.maxHp;

  useEffect(() => {
    Animated.timing(hpAnim, {
      toValue: hpPercent,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [hpPercent]);

  const hpColor =
    hpPercent > 0.6 ? '#22C55E' : hpPercent > 0.3 ? '#EAB308' : '#EF4444';

  const hpWidth = hpAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.hpContainer, side === 'right' && styles.hpContainerRight]}>
      {/* Avatar + Name */}
      <View style={[styles.avatarRow, side === 'right' && styles.avatarRowRight]}>
        <Text style={styles.avatar}>{fighter.characterEmoji}</Text>
        <Text style={styles.fighterName}>{fighter.name}</Text>
      </View>

      {/* HP Bar */}
      <View style={[styles.hpBarBg, side === 'right' && styles.hpBarRight]}>
        <Animated.View
          style={[
            styles.hpBarFill,
            {
              width: hpWidth,
              backgroundColor: hpColor,
            },
            side === 'right' && styles.hpFillRight,
          ]}
        />
        <Text style={styles.hpText}>
          {fighter.hp}/{fighter.maxHp}
        </Text>
      </View>

      {/* Ultimate Gauge (thin bar below HP) */}
      <View style={styles.ultBarBg}>
        <View
          style={[
            styles.ultBarFill,
            {
              width: `${ultGauge}%`,
              backgroundColor: ultGauge >= 100 ? '#FFD700' : '#9945FF',
            },
          ]}
        />
      </View>

      {/* Buffs */}
      {fighter.buffs.length > 0 && (
        <View style={styles.buffsRow}>
          {fighter.buffs.map((buff, i) => (
            <Text key={i} style={styles.buffIcon}>
              {buff}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
};

// --- Timer Component ---

const Timer: React.FC<{ time: number }> = ({ time }) => {
  const flashAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (time <= 10) {
      const flash = Animated.loop(
        Animated.sequence([
          Animated.timing(flashAnim, { toValue: 0.3, duration: 300, useNativeDriver: true }),
          Animated.timing(flashAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        ])
      );
      flash.start();
      return () => flash.stop();
    } else {
      flashAnim.setValue(1);
    }
  }, [time <= 10]);

  return (
    <Animated.View style={[styles.timerContainer, { opacity: flashAnim }]}>
      <Text style={[styles.timerText, time <= 10 && styles.timerTextUrgent]}>
        {time}
      </Text>
    </Animated.View>
  );
};

// --- Round Dots ---

const RoundDots: React.FC<{
  roundResults: Array<{ winnerId: string }>;
  playerId: string;
  roundsToWin: number;
}> = ({ roundResults, playerId, roundsToWin }) => {
  const dots: boolean[] = [];
  for (let i = 0; i < roundsToWin * 2 - 1; i++) {
    if (i < roundResults.length) {
      dots.push(roundResults[i].winnerId === playerId);
    } else {
      dots.push(false);
    }
  }

  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: roundsToWin }).map((_, i) => {
        const won = i < roundResults.filter((r) => r.winnerId === playerId).length;
        return (
          <Text key={i} style={[styles.dot, won && styles.dotWon]}>
            {won ? '●' : '○'}
          </Text>
        );
      })}
    </View>
  );
};

// --- Combo Counter ---

const ComboCounter: React.FC<{ combo: ComboData | null }> = ({ combo }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (combo && combo.isActive && combo.hits > 1) {
      scaleAnim.setValue(1.3);
      opacityAnim.setValue(1);
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 4 }).start();
    } else {
      Animated.timing(opacityAnim, { toValue: 0, duration: 500, useNativeDriver: true }).start();
    }
  }, [combo?.hits, combo?.isActive]);

  if (!combo || combo.hits <= 1) return null;

  return (
    <Animated.View
      style={[styles.comboContainer, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}
    >
      <Text style={styles.comboHits}>{combo.hits} HITS!</Text>
      <Text style={styles.comboDamage}>{combo.totalDamage} DMG</Text>
    </Animated.View>
  );
};

// --- Main HUD ---

export const GameHUD: React.FC<GameHUDProps> = ({
  player1,
  player2,
  timer,
  round,
  roundResults,
  player1Id,
  player2Id,
  roundsToWin,
  combo,
}) => {
  return (
    <View style={styles.container} pointerEvents="none">
      {/* Top Section: HP bars + Timer */}
      <View style={styles.topSection}>
        <HPBar fighter={player1} side="left" ultGauge={player1.ultGauge} />

        <View style={styles.centerTop}>
          <Timer time={timer} />
          <View style={styles.roundInfo}>
            <RoundDots roundResults={roundResults} playerId={player1Id} roundsToWin={roundsToWin} />
            <Text style={styles.roundText}>R{round}</Text>
            <RoundDots roundResults={roundResults} playerId={player2Id} roundsToWin={roundsToWin} />
          </View>
        </View>

        <HPBar fighter={player2} side="right" ultGauge={player2.ultGauge} />
      </View>

      {/* Combo Counter (center-right) */}
      <ComboCounter combo={combo} />
    </View>
  );
};

// --- Styles ---

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  topSection: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 8,
    alignItems: 'flex-start',
  },
  // HP Bar
  hpContainer: {
    flex: 1,
  },
  hpContainerRight: {
    alignItems: 'flex-end',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  avatarRowRight: {
    flexDirection: 'row-reverse',
  },
  avatar: {
    fontSize: 24,
    marginHorizontal: 4,
  },
  fighterName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  hpBarBg: {
    height: 16,
    backgroundColor: 'rgba(51, 51, 51, 0.8)',
    borderRadius: 8,
    overflow: 'hidden',
    width: '100%',
    justifyContent: 'center',
  },
  hpBarRight: {},
  hpBarFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 8,
  },
  hpFillRight: {
    left: undefined,
    right: 0,
  },
  hpText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  // Ultimate gauge
  ultBarBg: {
    height: 4,
    backgroundColor: 'rgba(51, 51, 51, 0.6)',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 2,
  },
  ultBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  // Buffs
  buffsRow: {
    flexDirection: 'row',
    marginTop: 2,
    gap: 2,
  },
  buffIcon: {
    fontSize: 14,
  },
  // Center
  centerTop: {
    width: 80,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  timerContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#555',
  },
  timerText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  timerTextUrgent: {
    color: '#EF4444',
  },
  // Round
  roundInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  roundText: {
    fontSize: 10,
    color: '#B0B0C0',
    fontWeight: 'bold',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 3,
  },
  dot: {
    fontSize: 10,
    color: '#555',
  },
  dotWon: {
    color: '#FFD700',
  },
  // Combo
  comboContainer: {
    position: 'absolute',
    right: 40,
    top: '35%',
    alignItems: 'center',
  },
  comboHits: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFD700',
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  comboDamage: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B35',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});
