export interface FeedbackView {
  id: string;
  lessonId: string;
  rating: number;
  reasons: string[];
  comment: string | null;
  createdAt: Date;
}

export interface SubmitFeedbackResult {
  created: boolean;
  feedback: FeedbackView;
}
