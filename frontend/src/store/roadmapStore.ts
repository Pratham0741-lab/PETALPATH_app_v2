import { create } from 'zustand';
import { api } from '../api/client';

export interface Category {
  id: string;
  title: string;
  description: string | null;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  modules: Module[];
  lessonsCount: number;
  lessonsCompleted: number;
  stars: number;
  isCompleted: boolean;
  isUnlocked: boolean;
}

export interface Module {
  id: string;
  categoryId: string;
  title: string;
  description: string | null;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  lessons: Lesson[];
  isCompleted: boolean;
  isUnlocked: boolean;
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  description: string | null;
  displayOrder: number;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  createdAt: string;
  updatedAt: string;
  isCompleted: boolean;
  isUnlocked: boolean;
  activities: Activity[];
  progress: {
    id: string;
    childId: string;
    lessonId: string;
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
    videoCompleted: boolean;
    listenCompleted: boolean;
    speakCompleted: boolean;
    writeCompleted: boolean;
    completedAt: string | null;
  } | null;
}

export interface Activity {
  id: string;
  lessonId: string;
  title: string;
  activityType: 'video' | 'listen' | 'speak' | 'write';
  contentUrl: string | null;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  video?: {
    id: string;
    activityId: string;
    filename: string;
    duration: number;
    thumbnail: string | null;
  } | null;
  audio?: {
    id: string;
    activityId: string;
    filename: string;
    duration: number;
  } | null;
}

interface RoadmapState {
  categories: Category[];
  expandedCategory: string | null;
  selectedModule: Module | null;
  selectedLesson: Lesson | null;
  activities: Activity[];
  currentLesson: Lesson | null;
  loading: boolean;
  error: string | null;

  // Compatibility fields
  selectedCategory: Category | null;
  lessons: Lesson[];
  completedLessons: string[];

  loadRoadmap: () => Promise<void>;
  expandCategory: (categoryId: string | null) => void;
  selectModule: (module: Module | null) => void;
  selectLesson: (lesson: Lesson | null) => Promise<void>;
  loadActivities: (lessonId: string) => Promise<void>;
  clearState: () => void;

  // Compatibility functions
  loadCategories: () => Promise<void>;
  selectCategory: (category: Category | null) => Promise<void>;
  loadLessons: (categoryId: string) => Promise<void>;
  isLessonUnlocked: (lessonId: string) => boolean;
  completeLesson: (lessonId: string) => Promise<void>;
  loadLessonProgress: () => Promise<void>;
  resetProgress: () => Promise<void>;
}


export const useRoadmapStore = create<RoadmapState>((set, get) => ({
  categories: [],
  expandedCategory: null,
  selectedModule: null,
  selectedLesson: null,
  activities: [],
  currentLesson: null,
  loading: false,
  error: null,

  // Compatibility fields
  selectedCategory: null,
  lessons: [],
  completedLessons: [],

  loadRoadmap: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.get('/roadmap');
      if (res.success && res.data) {
        const { roadmap, currentLesson } = res.data;
        set({
          categories: roadmap || [],
          currentLesson: currentLesson || null,
        });

        // Set completedLessons from progress
        const completedIds: string[] = [];
        (roadmap || []).forEach((cat: Category) => {
          cat.modules.forEach((mod: Module) => {
            mod.lessons.forEach((les: Lesson) => {
              if (les.isCompleted) {
                completedIds.push(les.id);
              }
            });
          });
        });
        set({ completedLessons: completedIds });

        // Sync compatibility lessons
        let currentSelCat = get().selectedCategory;
        if (!currentSelCat && (roadmap || []).length > 0) {
          currentSelCat = roadmap[0];
        }
        if (currentSelCat) {
          const matchedCat = (roadmap || []).find((c: Category) => c.id === currentSelCat!.id);
          if (matchedCat) {
            set({ selectedCategory: matchedCat });
            const catLessons: Lesson[] = [];
            matchedCat.modules.forEach((m: Module) => {
              catLessons.push(...m.lessons);
            });
            set({ lessons: catLessons });
          }
        }

        // Set default expanded category
        if (currentLesson && !get().expandedCategory) {
          const activeCat = (roadmap || []).find((c: Category) =>
            c.modules.some((m: Module) => m.lessons.some((l: Lesson) => l.id === currentLesson.id))
          );
          if (activeCat) {
            set({ expandedCategory: activeCat.id });
            const activeMod = activeCat.modules.find((m: Module) =>
              m.lessons.some((l: Lesson) => l.id === currentLesson.id)
            );
            if (activeMod) {
              set({ selectedModule: activeMod });
            }
          }
        } else if ((roadmap || []).length > 0 && !get().expandedCategory) {
          set({ expandedCategory: roadmap[0].id });
          if (roadmap[0].modules.length > 0) {
            set({ selectedModule: roadmap[0].modules[0] });
          }
        }

        const selectedLessonId = get().selectedLesson?.id;
        if (selectedLessonId) {
          let updatedLesson: Lesson | null = null;
          for (const cat of roadmap) {
            for (const mod of cat.modules) {
              const match = mod.lessons.find((l: Lesson) => l.id === selectedLessonId);
              if (match) {
                updatedLesson = match;
                break;
              }
            }
          }
          if (updatedLesson) {
            set({ selectedLesson: updatedLesson });
          }
        } else if (currentLesson && !get().selectedLesson) {
          set({ selectedLesson: currentLesson });
          await get().loadActivities(currentLesson.id);
        }
      }
    } catch (err: any) {
      set({ error: err.message || 'Failed to load learning roadmap' });
    } finally {
      set({ loading: false });
    }
  },

  expandCategory: (categoryId) => {
    set({ expandedCategory: categoryId });
    if (categoryId) {
      const category = get().categories.find((c) => c.id === categoryId);
      if (category && category.modules.length > 0) {
        set({ selectedModule: category.modules[0] });
        if (category.modules[0].lessons.length > 0) {
          const firstLesson = category.modules[0].lessons[0];
          set({ selectedLesson: firstLesson });
          get().loadActivities(firstLesson.id);
        }
      }
    }
  },

  selectModule: (module) => {
    set({ selectedModule: module });
    if (module && module.lessons.length > 0) {
      const firstLesson = module.lessons[0];
      set({ selectedLesson: firstLesson });
      get().loadActivities(firstLesson.id);
    }
  },

  selectLesson: async (lesson) => {
    set({ selectedLesson: lesson });
    if (lesson) {
      try {
        await api.get(`/lessons/${lesson.id}`);
      } catch (err) {
        console.warn('Failed to log lesson selection on backend:', err);
      }
      await get().loadActivities(lesson.id);
    } else {
      set({ activities: [] });
    }
  },

  loadActivities: async (lessonId) => {
    set({ loading: true, error: null });
    try {
      const res = await api.get(`/activities?lessonId=${lessonId}`);
      const activitiesList = (res.data || []).sort(
        (a: Activity, b: Activity) => a.displayOrder - b.displayOrder
      );
      set({ activities: activitiesList });
    } catch (err: any) {
      set({ error: err.message || 'Failed to load activities' });
    } finally {
      set({ loading: false });
    }
  },

  clearState: () => {
    set({
      categories: [],
      expandedCategory: null,
      selectedModule: null,
      selectedLesson: null,
      activities: [],
      currentLesson: null,
      selectedCategory: null,
      lessons: [],
      completedLessons: [],
      error: null,
    });
  },

  // Compatibility implementations
  loadCategories: async () => {
    await get().loadRoadmap();
  },

  selectCategory: async (category) => {
    set({ selectedCategory: category });
    if (category) {
      const catLessons: Lesson[] = [];
      category.modules.forEach((m: Module) => {
        catLessons.push(...m.lessons);
      });
      set({ lessons: catLessons, selectedLesson: null, activities: [] });
    } else {
      set({ lessons: [] });
    }
  },

  loadLessons: async (categoryId) => {
    const category = get().categories.find((c) => c.id === categoryId);
    if (category) {
      const catLessons: Lesson[] = [];
      category.modules.forEach((m: Module) => {
        catLessons.push(...m.lessons);
      });
      set({ lessons: catLessons });
    }
  },

  isLessonUnlocked: (lessonId) => {
    let targetLesson: Lesson | null = null;
    for (const cat of get().categories) {
      for (const mod of cat.modules) {
        const found = mod.lessons.find((l) => l.id === lessonId);
        if (found) {
          targetLesson = found;
          break;
        }
      }
    }
    return targetLesson ? targetLesson.isUnlocked : false;
  },

  completeLesson: async (lessonId) => {
    // Optimistic update: immediately mark lesson as completed in local state
    set((state) => {
      const newCompletedLessons = state.completedLessons.includes(lessonId)
        ? state.completedLessons
        : [...state.completedLessons, lessonId];

      // Deep-update the categories tree to set isCompleted and unlock the next lesson
      const updatedCategories = state.categories.map(cat => ({
        ...cat,
        modules: cat.modules.map(mod => {
          let foundCompleted = false;
          const updatedLessons = mod.lessons.map((les, idx) => {
            if (les.id === lessonId) {
              foundCompleted = true;
              return { ...les, isCompleted: true };
            }
            return les;
          });
          // Unlock the next lesson after the one we just completed
          if (foundCompleted) {
            for (let i = 0; i < updatedLessons.length; i++) {
              if (updatedLessons[i].id === lessonId && i + 1 < updatedLessons.length) {
                updatedLessons[i + 1] = { ...updatedLessons[i + 1], isUnlocked: true };
                break;
              }
            }
          }
          return { ...mod, lessons: updatedLessons };
        }),
      }));

      // Re-sync the compatibility lessons array if a category is selected
      let updatedLessons = state.lessons;
      if (state.selectedCategory) {
        const freshCat = updatedCategories.find(c => c.id === state.selectedCategory!.id);
        if (freshCat) {
          const catLessons: Lesson[] = [];
          freshCat.modules.forEach((m: Module) => catLessons.push(...m.lessons));
          updatedLessons = catLessons;
        }
      }

      return {
        completedLessons: newCompletedLessons,
        categories: updatedCategories,
        lessons: updatedLessons,
      };
    });

    // Then sync with backend in the background
    try {
      await api.post('/progress/complete', { lessonId });
      await get().loadRoadmap();
    } catch (err) {
      console.warn('Failed to complete lesson on backend:', err);
    }
  },

  loadLessonProgress: async () => {
    // Already loaded progress via loadRoadmap
    await get().loadRoadmap();
  },

  resetProgress: async () => {
    set({ loading: true, error: null });

    // Optimistic reset: clear completions locally
    set((state) => {
      const updatedCategories = state.categories.map((cat, catIdx) => ({
        ...cat,
        lessonsCompleted: 0,
        stars: 0,
        isCompleted: false,
        isUnlocked: catIdx === 0,
        modules: cat.modules.map((mod, modIdx) => {
          const updatedLessons = mod.lessons.map((les, lesIdx) => {
            const shouldBeUnlocked = (catIdx === 0 && modIdx === 0 && lesIdx === 0);
            return {
              ...les,
              isCompleted: false,
              isUnlocked: shouldBeUnlocked,
              progress: null
            };
          });
          return {
            ...mod,
            isCompleted: false,
            isUnlocked: (catIdx === 0 && modIdx === 0),
            lessons: updatedLessons
          };
        }),
      }));

      return {
        completedLessons: [],
        categories: updatedCategories,
        lessons: [],
        selectedCategory: null,
        selectedModule: null,
        selectedLesson: null,
        activities: [],
      };
    });

    try {
      await api.post('/progress/reset', {});
      await get().loadRoadmap();
      const { useProgressStore } = await import('./progressStore');
      const { useRewardsStore } = await import('./rewardsStore');
      await useProgressStore.getState().refreshProgress();
      await useRewardsStore.getState().refreshRewards();
    } catch (err: any) {
      set({ error: err.message || 'Failed to reset progress' });
    } finally {
      set({ loading: false });
    }
  },
}));

