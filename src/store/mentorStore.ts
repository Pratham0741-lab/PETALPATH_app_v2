import { create } from 'zustand';
import { api } from '../api/client';
import { enhanceMentor } from '../constants/mentors';

export interface Mentor {
  id: string;
  name: string;
  characterType: string;
  personality: string;
  voiceStyle: string;
  description: string;
  imagePath: string;
  color: string;
  iconName: string;
  species: string;
  funFact: string;
}

interface MentorState {
  mentorList: Mentor[];
  loading: boolean;
  error: string | null;
  refreshMentors: () => Promise<void>;
}

export const useMentorStore = create<MentorState>((set) => ({
  mentorList: [],
  loading: false,
  error: null,
  
  refreshMentors: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.get('/mentors');
      const mentors = response.data || [];
      
      // Enhance backend data with frontend-only visual details
      const enhancedMentors = mentors.map((m: any) => enhanceMentor(m)).filter(Boolean) as Mentor[];
      
      set({ mentorList: enhancedMentors });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch mentors' });
    } finally {
      set({ loading: false });
    }
  },
}));
