import React, { useRef, useState } from 'react';
import { Button, Row, Col, Form, Spinner, Alert } from 'react-bootstrap';
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
  const [draggedVideoId, setDraggedVideoId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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

  const handleDragStart = (e: React.DragEvent, videoId: string) => {
    // Check if there are any annotations for any of the videos
    const hasAnnotations = timestamps.some(t => 
      videos.some(v => v.id === t.videoId)
    );
    if (hasAnnotations) {
      e.preventDefault();
      setError('Cannot reorder videos: annotations exist. Please delete all annotations first.');
      return;
    }
    
    setDraggedVideoId(videoId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (!draggedVideoId) return;

    const dragIndex = videos.findIndex(v => v.id === draggedVideoId);
    if (dragIndex === -1 || dragIndex === dropIndex) {
      setDraggedVideoId(null);
      setDragOverIndex(null);
      return;
    }

    // Reorder videos
    const updatedVideos = [...videos];
    const [draggedVideo] = updatedVideos.splice(dragIndex, 1);
    updatedVideos.splice(dropIndex, 0, draggedVideo);

    // Recalculate start times for all videos after the first one
    for (let i = 1; i < updatedVideos.length; i++) {
      const prevVideo = updatedVideos[i - 1];
      const prevStartSeconds = parseTime(prevVideo.startTime);
      const newStartSeconds = prevStartSeconds + prevVideo.duration;
      updatedVideos[i] = {
        ...updatedVideos[i],
        startTime: formatTime(newStartSeconds)
      };
    }

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

    setDraggedVideoId(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedVideoId(null);
    setDragOverIndex(null);
  };

  const getVideoTimeRange = (video: VideoFile): string => {
    const startSeconds = parseTime(video.startTime);
    const endSeconds = startSeconds + video.duration;
    return `${video.startTime} - ${formatTime(endSeconds)}`;
  };

  return (
    <div>
      {/* Start time field at the top */}
      {videos.length > 0 && (
        <Row className="align-items-center mb-3 p-3 bg-light rounded">
          <Col xs="auto">
            <Form.Label className="mb-1 fw-bold">Start Time:</Form.Label>
          </Col>
          <Col xs="auto">
            <Form.Control
              type="text"
              size="sm"
              value={videos[0].startTime}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleStartTimeChange(videos[0].id, e.target.value)}
              placeholder="HH:MM:SS"
              pattern="[0-9]{2}:[0-9]{2}:[0-9]{2}"
              style={{ width: '120px' }}
              title="Start time in HH:MM:SS format"
            />
          </Col>
          <Col>
            <small className="text-muted">
              Set the real-world start time for the first video. Subsequent videos will automatically continue from where the previous one ends.
            </small>
          </Col>
        </Row>
      )}

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Video list */}
      {videos.map((video, index) => (
        <Row 
          key={video.id} 
          className={`align-items-center mb-2 p-2 border rounded ${
            dragOverIndex === index ? 'border-primary bg-light' : ''
          } ${draggedVideoId === video.id ? 'opacity-50' : ''}`}
          draggable
          onDragStart={(e) => handleDragStart(e, video.id)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, index)}
          onDragEnd={handleDragEnd}
          style={{ 
            cursor: draggedVideoId ? 'grabbing' : 'grab',
            transition: 'all 0.2s ease'
          }}
        >
          <Col xs="auto">
            <div 
              className="text-muted"
              style={{ fontSize: '1.2em', cursor: 'grab' }}
              title="Drag to reorder"
            >
              ⋮⋮
            </div>
          </Col>
          <Col>
            <div className="fw-bold" title={video.name}>
              {video.name}
            </div>
            <small className="text-muted">
              Duration: {formatTime(video.duration)} | Time range: {getVideoTimeRange(video)}
            </small>
          </Col>
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

      {/* Add video button at the bottom */}
      <Row className="align-items-center mt-3">
        <Col>
          <Button 
            variant="primary" 
            onClick={handleAddVideo}
            disabled={loading}
            className="w-100"
            data-add-video="true"
          >
            {loading ? (
              <>
                <Spinner size="sm" className="me-2" />
                Loading...
              </>
            ) : (
              '📄 Add Video Files'
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
      </Row>
    </div>
  );
};

export default VideoUpload;
