import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useChildStore } from '../store/childStore';

export function useChildSwitch() {
  const queryClient = useQueryClient();
  const setActiveChild = useChildStore((s) => s.setActiveChild);

  const switchChild = useCallback(async (childId: string) => {
    const child = useChildStore.getState().childrenList.find(c => c.id === childId);
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
    ]);
  }, [queryClient, setActiveChild]);

  return { switchChild };
}
