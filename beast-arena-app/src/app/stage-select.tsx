import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useGameStore } from '../stores/useGameStore';

interface StageConfig {
  id: string;
  name: string;
  emoji: string;
  description: string;
  colors: [string, string]; // gradient-ish top/bottom
}

const STAGES: StageConfig[] = [
  {
    id: 'ancient_temple',
    name: 'Ancient Temple',
    emoji: '🏛️',
    description: 'Đền đài cổ xưa, ánh đuốc bập bùng',
    colors: ['#8B4513', '#D2691E'],
  },
  {
    id: 'bamboo_forest',
    name: 'Bamboo Forest',
    emoji: '🎋',
    description: 'Rừng trúc xanh mát, lá bay rơi',
    colors: ['#2E8B57', '#90EE90'],
  },
  {
    id: 'thunder_peak',
    name: 'Thunder Peak',
    emoji: '⛰️',
    description: 'Đỉnh núi sấm sét, mây đen vần vũ',
    colors: ['#4B0082', '#6A5ACD'],
  },
];

export default function StageSelectScreen() {
  const router = useRouter();
  const { selectedStage, selectStage } = useGameStore();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const handleConfirm = () => {
    if (!selectedStage) return;
    router.push('/fight');
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Text style={styles.title}>CHỌN SÀN ĐẤU</Text>
      <Text style={styles.subtitle}>Mỗi sàn đấu mang sức mạnh riêng</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.stageList}
        style={styles.scrollView}
      >
        {STAGES.map((stage) => {
          const isSelected = selectedStage === stage.id;
          return (
            <TouchableOpacity
              key={stage.id}
              style={[styles.stageCard, isSelected && styles.stageCardSelected]}
              onPress={() => selectStage(stage.id)}
              activeOpacity={0.8}
            >
              {/* Color preview */}
              <View
                style={[
                  styles.stagePreview,
                  { backgroundColor: stage.colors[0] },
                ]}
              >
                <View
                  style={[
                    styles.stagePreviewBottom,
                    { backgroundColor: stage.colors[1] },
                  ]}
                />
                <Text style={styles.stageEmoji}>{stage.emoji}</Text>
              </View>

              <View style={styles.stageInfo}>
                <Text style={styles.stageName}>{stage.name}</Text>
                <Text style={styles.stageDesc}>{stage.description}</Text>
              </View>

              {isSelected && (
                <View style={styles.selectedBadge}>
                  <Text style={styles.selectedBadgeText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Confirm */}
      <TouchableOpacity
        style={[styles.confirmBtn, !selectedStage && styles.confirmBtnDisabled]}
        onPress={handleConfirm}
        disabled={!selectedStage}
      >
        <Text style={styles.confirmBtnText}>⚔️ VÀO TRẬN</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D1A',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#B0B0C0',
    textAlign: 'center',
    marginBottom: 24,
  },
  scrollView: {
    flex: 1,
  },
  stageList: {
    paddingHorizontal: 8,
    gap: 16,
    alignItems: 'center',
  },
  stageCard: {
    width: 200,
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  stageCardSelected: {
    borderColor: '#FFD700',
  },
  stagePreview: {
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stagePreviewBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    opacity: 0.6,
  },
  stageEmoji: {
    fontSize: 56,
  },
  stageInfo: {
    padding: 12,
  },
  stageName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  stageDesc: {
    fontSize: 12,
    color: '#B0B0C0',
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedBadgeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0D0D1A',
  },
  confirmBtn: {
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  confirmBtnDisabled: {
    backgroundColor: '#333',
    opacity: 0.5,
  },
  confirmBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
