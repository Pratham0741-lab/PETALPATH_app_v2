import { Story, StoryPage, StoryVocabulary } from '@prisma/client';

export interface StoryListQuery {
  page: number;
  limit: number;
  category?: string;
  difficulty?: string;
  readingLevel?: number;
  search?: string;
}

export interface StoryDetail extends Story {
  pages: StoryPage[];
  vocabulary: StoryVocabulary[];
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface StoryListResult {
  data: Story[];
  pagination: PaginationMeta;
}
