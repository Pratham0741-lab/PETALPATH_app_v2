export interface Point3D {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface PoseLandmarks {
  nose: Point3D;
  leftEye: Point3D;
  rightEye: Point3D;
  leftEar: Point3D;
  rightEar: Point3D;
  leftShoulder: Point3D;
  rightShoulder: Point3D;
  leftElbow: Point3D;
  rightElbow: Point3D;
  leftWrist: Point3D;
  rightWrist: Point3D;
  leftHip: Point3D;
  rightHip: Point3D;
  leftKnee: Point3D;
  rightKnee: Point3D;
  leftAnkle: Point3D;
  rightAnkle: Point3D;
  rawLandmarks: Point3D[];
}

export interface PoseFrame {
  landmarks: PoseLandmarks;
  timestamp: number;
  confidence: number;
}

export interface PoseDetectionResult {
  detected: boolean;
  pose: PoseFrame | null;
  confidence: number;
  landmarkCount: number;
}

export interface ValidationResult {
  detected: boolean;
  confidence: number;
  primitiveName: string;
  feedback?: string;
}

export type ActivityType =
  | 'raise_hands'
  | 'touch_head'
  | 'touch_knees'
  | 'hands_on_hips'
  | 'hug_yourself'
  | 'wave'
  | 'clap'
  | 'jump';

export type ActivityState = 'searching' | 'detected' | 'completed';

export interface ActivityEngineResult {
  activityType: ActivityType;
  state: ActivityState;
  confidence: number;
  feedback: string;
}
