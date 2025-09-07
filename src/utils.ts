import { VideoFile } from './types';

// Convert seconds to HH:MM:SS format
export const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Convert HH:MM:SS to seconds
export const parseTime = (timeStr: string): number => {
  const parts = timeStr.split(':').map(Number);
  if (parts.length !== 3) return 0;
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
};

// Generate a unique ID
export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

// Get video colors for visual distinction - stronger colors with good contrast
export const getVideoColors = (): string[] => [
  '#DC2626', // Red
  '#059669', // Green
  '#2563EB', // Blue
  '#7C3AED', // Purple
  '#EA580C', // Orange
  '#BE185D', // Pink
  '#0891B2', // Cyan
  '#65A30D', // Lime
  '#7C2D12', // Brown
  '#1F2937'  // Dark Gray
];

// Parse start time from filename or use fallback
export const inferStartTime = (filename: string, fileDate?: Date): string => {
  // Try to parse YYYYMMDD_HHMMSS pattern
  const dateTimeMatch = filename.match(/(\d{8})_(\d{6})/);
  if (dateTimeMatch) {
    const timeStr = dateTimeMatch[2];
    const hours = timeStr.substr(0, 2);
    const minutes = timeStr.substr(2, 2);
    const seconds = timeStr.substr(4, 2);
    return `${hours}:${minutes}:${seconds}`;
  }
  
  // Try to parse HH-MM-SS or HH_MM_SS pattern
  const timeMatch = filename.match(/(\d{2})[-_](\d{2})[-_](\d{2})/);
  if (timeMatch) {
    return `${timeMatch[1]}:${timeMatch[2]}:${timeMatch[3]}`;
  }
  
  // Fallback to file modification time if available
  if (fileDate) {
    return formatTime(fileDate.getHours() * 3600 + fileDate.getMinutes() * 60 + fileDate.getSeconds());
  }
  
  // Default fallback
  return '00:00:00';
};

// Calculate total duration across all videos
export const calculateTotalDuration = (videos: VideoFile[]): number => {
  return videos.reduce((total, video) => total + video.duration, 0);
};

// Find which video contains a specific time
export const findVideoAtTime = (videos: VideoFile[], totalSeconds: number): { videoIndex: number; videoTime: number } => {
  let accumulatedTime = 0;
  
  for (let i = 0; i < videos.length; i++) {
    if (totalSeconds <= accumulatedTime + videos[i].duration) {
      return {
        videoIndex: i,
        videoTime: totalSeconds - accumulatedTime
      };
    }
    accumulatedTime += videos[i].duration;
  }
  
  // If time is beyond all videos, return last video
  return {
    videoIndex: Math.max(0, videos.length - 1),
    videoTime: videos.length > 0 ? videos[videos.length - 1].duration : 0
  };
};

// Calculate absolute time from video start time and offset
export const calculateAbsoluteTime = (startTime: string, offsetSeconds: number): string => {
  const startSeconds = parseTime(startTime);
  const totalSeconds = startSeconds + offsetSeconds;
  return formatTime(totalSeconds);
};

// Calculate real-world time based on first video's start time and current position
export const calculateRealWorldTime = (videos: VideoFile[], currentTimeSeconds: number): string => {
  if (videos.length === 0) return '00:00:00';
  
  const firstVideoStartTime = videos[0].startTime;
  const startSeconds = parseTime(firstVideoStartTime);
  const realWorldSeconds = startSeconds + currentTimeSeconds;
  
  return formatTime(realWorldSeconds);
};

// Get video duration from file
export const getVideoDuration = (file: File): Promise<number> => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    
    video.onerror = () => {
      window.URL.revokeObjectURL(video.src);
      resolve(0);
    };
    
    video.src = URL.createObjectURL(file);
  });
};

// Export timestamps to CSV
export const exportToCSV = (timestamps: any[]): void => {
  const headers = [
    'event_index',
    'event_name', 
    'at_second_first',
    'at_second_current',
    'time_HH:MM:SS',
    'video_id',
    'video_name',
    'note'
  ];
  
  const csvContent = [
    headers.join(','),
    ...timestamps.map(t => [
      t.eventId,
      `"${t.eventName}"`,
      t.atSecondFirst,
      t.atSecondCurrent,
      t.timeHHMMSS,
      `"${t.videoId}"`,
      `"${t.videoName}"`,
      `"${t.note}"`
    ].join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `pedestrian_count_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
