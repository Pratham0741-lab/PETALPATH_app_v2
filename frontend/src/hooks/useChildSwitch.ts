import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useChildStore, type Child } from '../store/childStore';

export function useChildSwitch() {
  const queryClient = useQueryClient();
  const setActiveChild = useChildStore((s) => s.setActiveChild);

  const switchChild = useCallback(async (childOrId: string | Child) => {
    let child: Child | undefined;
    if (typeof childOrId === 'string') {
      child = useChildStore.getState().childrenList.find(c => c.id === childOrId);
    } else {
      child = childOrId;
    }
    if (!child) return;

    await setActiveChild(child);

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['roadmap'] }),
      queryClient.invalidateQueries({ queryKey: ['progress'] }),
      queryClient.invalidateQueries({ queryKey: ['recommendations'] }),
      queryClient.invalidateQueries({ queryKey: ['rewards'] }),
      queryClient.invalidateQueries({ queryKey: ['mastery'] }),
      queryClient.invalidateQueries({ queryKey: ['placements'] }),
      /*
       * Curriculum covers the Explore garden, subject screens and My Story, and
       * it is cached for a day so those screens paint instantly. That cache is
       * per-child data under a shared key, so without this the new child saw the
       * previous child's flowers and companion until the cache expired.
       */
      queryClient.invalidateQueries({ queryKey: ['curriculum'] }),
      queryClient.invalidateQueries({ queryKey: ['children'] }),
    ]);
  }, [queryClient, setActiveChild]);

  return { switchChild };
}
