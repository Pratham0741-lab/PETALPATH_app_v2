export type Child = {
  id: string;
  userId: string;
  name: string;
  age: number;
  ageGroup: string;
  avatar: string;
  mentorId: string | null;
  mentor?: {
    id: string;
    name: string;
    characterType: string;
    personality: string;
    voiceStyle: string;
    description: string;
    imagePath: string;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type ChildFormData = {
  name: string;
  age: number;
  avatar: string;
  mentorId?: string | null;
};
