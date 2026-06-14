import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { colors, radius, typography } from '../../../theme';
import { Ionicons } from '@expo/vector-icons';
import { Module } from '../../../store/roadmapStore';
import { GlowTarget } from '../../../components/tutorial/GlowTarget';

interface ModuleNodeProps {
  module: Module;
  onPress: () => void;
  color: string;
  xOffset: number; // For the curved zig-zag offset
  index: number;
}

export const ModuleNode: React.FC<ModuleNodeProps> = ({
  module,
  onPress,
  color,
  xOffset,
  index,
}) => {
  // Determine state based on module properties
  const isLocked = !module.isUnlocked;
  const isCompleted = module.isCompleted;
  const isCurrent = module.isUnlocked && !module.isCompleted;

  // Label to display inside the node
  const getLabel = () => {
    const title = module.title;
    if (title.toLowerCase().startsWith('module')) {
      // Return e.g. "1" or "A-C"
      return title.replace(/module\s*/i, '');
    }
    return title; // Return full title, e.g. "Lines", "Curves", "Patterns"
  };

  const labelTextStr = getLabel();
  const labelFontSize = labelTextStr.length > 7 ? 10 : labelTextStr.length > 5 ? 12 : 15;

  return (
    <View style={[styles.wrapper, { transform: [{ translateX: xOffset }] }]}>
      {/* Node Button wrapped with pulsing GlowTarget if active/current */}
      <GlowTarget active={isCurrent} color={color} borderRadius={38}>
        <TouchableOpacity
          activeOpacity={isLocked ? 1 : 0.8}
          onPress={isLocked ? undefined : onPress}
          style={[
            styles.node,
            { backgroundColor: isLocked ? '#1E234D' : colors.backgroundSecondary },
            { borderColor: isLocked ? '#2B326A' : isCurrent ? color : color + '90' },
            isCurrent && styles.currentNode,
            isCurrent && {
              shadowColor: color,
              shadowOpacity: 0.5,
              shadowRadius: 12,
            },
          ]}
        >
          {isLocked ? (
            <Ionicons name="lock-closed" size={24} color={colors.textMuted} />
          ) : isCompleted ? (
            <View style={[styles.innerCircle, { backgroundColor: colors.green }]}>
              <Ionicons name="checkmark" size={26} color={colors.white} />
            </View>
          ) : (
            <View style={[styles.innerCircle, { backgroundColor: color }]}>
              <Text style={[styles.labelText, { fontSize: labelFontSize }]}>{labelTextStr}</Text>
            </View>
          )}
        </TouchableOpacity>
      </GlowTarget>

      {/* Floating Mini Badge if current or completed */}
      {isCurrent && (
        <View style={[styles.glowBadge, { backgroundColor: color }]}>
          <Text style={styles.badgeText}>GO</Text>
        </View>
      )}

      {/* Label under node */}
      <Text style={[styles.nodeLabel, isLocked && styles.lockedLabel]}>
        {module.title}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    marginVertical: 14,
    position: 'relative',
    width: 120, // Constrain width to center text nicely
  },
  node: {
    width: 76,
    height: 76,
    borderRadius: radius.full,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  currentNode: {
    borderWidth: 6,
  },
  innerCircle: {
    width: 60,
    height: 60,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  glowBadge: {
    position: 'absolute',
    top: -4,
    right: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  nodeLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 6,
  },
  lockedLabel: {
    color: colors.textMuted,
  },
});
