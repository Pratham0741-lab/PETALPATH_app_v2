import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { colors, spacing, radius, typography } from '../../../theme';
import { Ionicons } from '@expo/vector-icons';
import { Module, Lesson } from '../../../store/roadmapStore';

interface ModuleLessonsModalProps {
  visible: boolean;
  module: Module | null;
  onClose: () => void;
  onSelectLesson: (lesson: Lesson) => void;
}

export const ModuleLessonsModal: React.FC<ModuleLessonsModalProps> = ({
  visible,
  module,
  onClose,
  onSelectLesson,
}) => {
  if (!module) return null;

  const getDifficultyColor = (diff?: string) => {
    switch (diff) {
      case 'EASY':
        return colors.green;
      case 'MEDIUM':
        return colors.yellow;
      case 'HARD':
        return '#EF4444';
      default:
        return colors.green;
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerInfo}>
                  <Text style={styles.title}>{module.title}</Text>
                  {module.description ? (
                    <Text style={styles.subtitle}>{module.description}</Text>
                  ) : null}
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              {/* Lessons List */}
              <ScrollView
                style={styles.listContainer}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              >
                {module.lessons.map((lesson, index) => {
                  const isLocked = !lesson.isUnlocked;
                  const isCompleted = lesson.isCompleted;
                  const diffColor = getDifficultyColor(lesson.difficulty);

                  return (
                    <View
                      key={lesson.id}
                      style={[
                        styles.lessonRow,
                        isLocked && styles.lockedRow,
                        isCompleted && styles.completedRow,
                      ]}
                    >
                      {/* Left: Status Icon */}
                      <View
                        style={[
                          styles.statusBox,
                          isLocked
                            ? styles.statusLocked
                            : isCompleted
                            ? styles.statusCompleted
                            : styles.statusUnlocked,
                        ]}
                      >
                        <Ionicons
                          name={
                            isLocked
                              ? 'lock-closed'
                              : isCompleted
                              ? 'checkmark-circle'
                              : 'play'
                          }
                          size={20}
                          color={
                            isLocked
                              ? colors.textMuted
                              : isCompleted
                              ? colors.green
                              : colors.white
                          }
                        />
                      </View>

                      {/* Middle: Details */}
                      <View style={styles.lessonInfo}>
                        <Text style={[styles.lessonTitle, isLocked && styles.lockedText]}>
                          {lesson.title}
                        </Text>
                        <Text style={styles.lessonDesc} numberOfLines={2}>
                          {isLocked ? 'Complete preceding lessons to unlock!' : lesson.description || 'Learn and practice.'}
                        </Text>
                        {!isLocked && (
                          <View
                            style={[
                              styles.diffBadge,
                              { backgroundColor: diffColor + '20', borderColor: diffColor },
                            ]}
                          >
                            <Text style={[styles.diffText, { color: diffColor }]}>
                              {lesson.difficulty}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Right: CTA Button */}
                      {!isLocked ? (
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => {
                            onClose();
                            onSelectLesson(lesson);
                          }}
                          style={[
                            styles.actionButton,
                            isCompleted ? styles.reviewBtn : styles.startBtn,
                          ]}
                        >
                          <Text style={styles.actionBtnText}>
                            {isCompleted ? 'Review' : 'Start'}
                          </Text>
                          <Ionicons
                            name="chevron-forward"
                            size={14}
                            color={colors.white}
                          />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 14, 38, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.lg,
    width: '100%',
    maxHeight: '80%',
    borderWidth: 1.5,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 15,
    elevation: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerInfo: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    marginTop: 2,
  },
  closeButton: {
    padding: 6,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(36, 43, 92, 0.4)',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  lockedRow: {
    opacity: 0.55,
  },
  completedRow: {
    borderColor: 'rgba(16, 185, 129, 0.25)',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  statusBox: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  statusLocked: {
    backgroundColor: '#242B5C',
  },
  statusCompleted: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusUnlocked: {
    backgroundColor: colors.purple,
  },
  lessonInfo: {
    flex: 1,
    paddingRight: spacing.xs,
  },
  lessonTitle: {
    color: colors.text,
    fontSize: typography.sizes.md,
    fontWeight: '700',
    marginBottom: 2,
  },
  lockedText: {
    color: colors.textMuted,
  },
  lessonDesc: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    lineHeight: 18,
    marginBottom: 4,
  },
  diffBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingVertical: 1,
    paddingHorizontal: 6,
    marginTop: 2,
  },
  diffText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 3,
  },
  startBtn: {
    backgroundColor: colors.purple,
  },
  reviewBtn: {
    backgroundColor: '#34D399',
  },
  actionBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
});
