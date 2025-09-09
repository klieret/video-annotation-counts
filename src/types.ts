export interface VideoFile {
  id: string;
  file: File;
  name: string;
  duration: number;
  startTime: string; // HH:MM:SS format
  color: string;
  url: string;
}

export interface EventType {
  id: number;
  name: string;
  color: string;
  count: number;
}

export interface Timestamp {
  id: string;
  eventId: number;
  eventName: string;
  atSecondFirst: number; // seconds from start of first video
  atSecondCurrent: number; // seconds from start of current video
  timeHHMMSS: string; // HH:MM:SS format
  videoId: string;
  videoName: string;
  note: string;
}

export interface VideoState {
  currentTime: number; // total seconds across all videos
  currentVideoIndex: number;
  currentVideoTime: number; // seconds within current video
  isPlaying: boolean;
  isMuted: boolean;
  playbackRate: number;
  totalDuration: number;
}

export interface SessionData {
  version: string;
  exportDate: string;
  darkMode: boolean;
  eventTypes: EventType[];
  timestamps: Timestamp[];
  leftPanelWidth: number;
  seekSeconds: number;
  seekSecondsShift: number;
  videoFiles: {
    name: string;
    startTime: string;
    duration: number;
  }[];
}
