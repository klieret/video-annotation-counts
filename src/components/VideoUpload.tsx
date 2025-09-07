import React, { useRef, useState } from 'react';
import { Button, Row, Col, Form, Badge, Spinner, Alert } from 'react-bootstrap';
import { VideoFile, VideoState, Timestamp } from '../types';
import { generateId, getVideoColors, inferStartTime, getVideoDuration, calculateTotalDuration, parseTime, formatTime, calculateRealWorldTime } from '../utils';

interface VideoUploadProps {
  videos: VideoFile[];
  onVideosChange: (videos: VideoFile[]) => void;
  onVideoStateChange: React.Dispatch<React.SetStateAction<VideoState>>;
  timestamps: Timestamp[];
  onTimestampsChange: (timestamps: Timestamp[]) => void;
}

const VideoUpload: React.FC<VideoUploadProps> = ({ videos, onVideosChange, onVideoStateChange, timestamps, onTimestampsChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleAddVideo = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setLoading(true);
    setError('');

    try {
      const colors = getVideoColors();
      const newVideos: VideoFile[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file type
        if (!file.type.startsWith('video/')) {
          throw new Error(`File ${file.name} is not a video file`);
        }

        const duration = await getVideoDuration(file);
        if (duration === 0) {
          throw new Error(`Could not load video ${file.name}`);
        }

        // Calculate start time
        let startTime: string;
        if (videos.length === 0 && newVideos.length === 0) {
          // First video - infer from filename or file date
          startTime = inferStartTime(file.name, new Date(file.lastModified));
        } else {
          // Subsequent videos - calculate from previous video end time
          const allVideos = [...videos, ...newVideos];
          const lastVideo = allVideos[allVideos.length - 1];
          const lastStartSeconds = parseTime(lastVideo.startTime);
          const newStartSeconds = lastStartSeconds + lastVideo.duration;
          startTime = formatTime(newStartSeconds);
        }

        const videoFile: VideoFile = {
          id: generateId(),
          file,
          name: file.name,
          duration,
          startTime,
          color: colors[(videos.length + newVideos.length) % colors.length],
          url: URL.createObjectURL(file)
        };

        newVideos.push(videoFile);
      }

      const updatedVideos = [...videos, ...newVideos];
      onVideosChange(updatedVideos);

      // Update video state
      onVideoStateChange({
        currentTime: 0,
        currentVideoIndex: 0,
        currentVideoTime: 0,
        isPlaying: false,
        isMuted: true,
        playbackRate: 1.0,
        totalDuration: calculateTotalDuration(updatedVideos)
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load video(s)');
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveVideo = (videoId: string) => {
    // Check if there are any annotations for this video
    const hasAnnotations = timestamps.some(t => t.videoId === videoId);
    if (hasAnnotations) {
      setError('Cannot remove video: annotations exist for this video. Please delete all annotations first.');
      return;
    }

    const updatedVideos = videos.filter(v => v.id !== videoId);
    
    // Revoke object URL to free memory
    const videoToRemove = videos.find(v => v.id === videoId);
    if (videoToRemove) {
      URL.revokeObjectURL(videoToRemove.url);
    }

    // Recalculate start times for remaining videos
    const recalculatedVideos = updatedVideos.map((video, index) => {
      if (index === 0) {
        return video; // Keep first video's start time
      } else {
        const prevVideo = updatedVideos[index - 1];
        const prevStartSeconds = parseTime(prevVideo.startTime);
        const newStartSeconds = prevStartSeconds + prevVideo.duration;
        return {
          ...video,
          startTime: formatTime(newStartSeconds)
        };
      }
    });

    onVideosChange(recalculatedVideos);

    // Update video state
    onVideoStateChange({
      currentTime: 0,
      currentVideoIndex: 0,
      currentVideoTime: 0,
      isPlaying: false,
      isMuted: true,
      playbackRate: 1.0,
      totalDuration: calculateTotalDuration(recalculatedVideos)
    });
  };

  const handleStartTimeChange = (videoId: string, newStartTime: string) => {
    const videoIndex = videos.findIndex(v => v.id === videoId);
    if (videoIndex === -1) return;

    const updatedVideos = [...videos];
    updatedVideos[videoIndex] = { ...updatedVideos[videoIndex], startTime: newStartTime };

    // Recalculate start times for subsequent videos
    for (let i = videoIndex + 1; i < updatedVideos.length; i++) {
      const prevVideo = updatedVideos[i - 1];
      const prevStartSeconds = parseTime(prevVideo.startTime);
      const newStartSeconds = prevStartSeconds + prevVideo.duration;
      updatedVideos[i] = {
        ...updatedVideos[i],
        startTime: formatTime(newStartSeconds)
      };
    }

    onVideosChange(updatedVideos);

    // Update all existing timestamps with new real-world times
    if (timestamps.length > 0) {
      const updatedTimestamps = timestamps.map(timestamp => ({
        ...timestamp,
        timeHHMMSS: calculateRealWorldTime(updatedVideos, timestamp.atSecondFirst)
      }));
      onTimestampsChange(updatedTimestamps);
    }
  };

  const getVideoTimeRange = (video: VideoFile): string => {
    const startSeconds = parseTime(video.startTime);
    const endSeconds = startSeconds + video.duration;
    return `${video.startTime} - ${formatTime(endSeconds)}`;
  };

  return (
    <div>
      <Row className="align-items-center mb-3">
        <Col xs="auto">
          <Button 
            variant="primary" 
            onClick={handleAddVideo}
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner size="sm" className="me-2" />
                Loading...
              </>
            ) : (
              '+ Add Video'
            )}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
        </Col>
        <Col xs="auto">
          <Badge bg="info">
            {videos.length} video{videos.length !== 1 ? 's' : ''} loaded
          </Badge>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {videos.map((video, index) => (
        <Row key={video.id} className="align-items-center mb-2 p-2 border rounded">
          <Col xs="auto">
            <div 
              className="video-indicator"
              style={{ backgroundColor: video.color }}
            />
          </Col>
          <Col>
            <div className="fw-bold">{video.name}</div>
            <small className="text-muted">
              Duration: {formatTime(video.duration)} | Time range: {getVideoTimeRange(video)}
            </small>
          </Col>
          {index === 0 && (
            <Col xs="auto">
              <Form.Label className="small text-muted mb-1">Start Time</Form.Label>
              <Form.Control
                type="text"
                size="sm"
                value={video.startTime}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleStartTimeChange(video.id, e.target.value)}
                placeholder="HH:MM:SS"
                pattern="[0-9]{2}:[0-9]{2}:[0-9]{2}"
                style={{ width: '100px' }}
                title="Start time in HH:MM:SS format"
              />
            </Col>
          )}
          <Col xs="auto">
            <Button
              variant="outline-danger"
              size="sm"
              onClick={() => handleRemoveVideo(video.id)}
            >
              Remove
            </Button>
          </Col>
        </Row>
      ))}
    </div>
  );
};

export default VideoUpload;
