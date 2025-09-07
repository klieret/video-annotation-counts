import React, { useRef, useEffect, useState } from 'react';
import { Card, Button, Row, Col, Form } from 'react-bootstrap';
import { VideoFile, VideoState, EventType, Timestamp } from '../types';
import { findVideoAtTime, formatTime, calculateRealWorldTime } from '../utils';

interface VideoPlayerProps {
  videos: VideoFile[];
  videoState: VideoState;
  onVideoStateChange: React.Dispatch<React.SetStateAction<VideoState>>;
  eventTypes: EventType[];
  onEventTypesChange: (eventTypes: EventType[]) => void;
  onEventMark: (eventId: number) => void;
  timestamps: Timestamp[];
  onTimestampsChange: (timestamps: Timestamp[]) => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videos,
  videoState,
  onVideoStateChange,
  eventTypes,
  onEventTypesChange,
  onEventMark,
  timestamps,
  onTimestampsChange
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showContextMenu, setShowContextMenu] = useState<{ show: boolean; x: number; y: number; eventId: number }>({
    show: false, x: 0, y: 0, eventId: 0
  });
  const [editingEventName, setEditingEventName] = useState<string>('');

  // Initialize video source when videos are first loaded
  useEffect(() => {
    if (!videoRef.current || videos.length === 0) return;
    
    const video = videoRef.current;
    const currentVideo = videos[videoState.currentVideoIndex];
    
    // Set initial video source if not set
    if (currentVideo && (!video.src || !video.src.includes('blob:'))) {
      video.src = currentVideo.url;
      video.load(); // Force reload of the video
    }
  }, [videos, videoState.currentVideoIndex]);

  // Update video element when state changes
  useEffect(() => {
    if (!videoRef.current || videos.length === 0) return;

    const video = videoRef.current;
    const { videoIndex, videoTime } = findVideoAtTime(videos, videoState.currentTime);
    
    // Switch video source if needed
    if (videoIndex !== videoState.currentVideoIndex) {
      video.src = videos[videoIndex].url;
      video.load(); // Force reload of the video
      onVideoStateChange((prev: VideoState) => ({ 
        ...prev, 
        currentVideoIndex: videoIndex,
        currentVideoTime: videoTime
      }));
    }

    // Update video time
    if (Math.abs(video.currentTime - videoTime) > 0.5) {
      video.currentTime = videoTime;
    }

    // Update playback state
    if (videoState.isPlaying && video.paused) {
      video.play().catch(console.error);
    } else if (!videoState.isPlaying && !video.paused) {
      video.pause();
    }

    // Update mute state
    video.muted = videoState.isMuted;

    // Update playback rate
    video.playbackRate = videoState.playbackRate;

  }, [videos, videoState, onVideoStateChange]);

  // Handle video time updates
  const handleTimeUpdate = () => {
    if (!videoRef.current || videos.length === 0) return;

    const video = videoRef.current;
    const currentVideo = videos[videoState.currentVideoIndex];
    if (!currentVideo) return;

    let accumulatedTime = 0;
    for (let i = 0; i < videoState.currentVideoIndex; i++) {
      accumulatedTime += videos[i].duration;
    }

    const totalTime = accumulatedTime + video.currentTime;
    
    onVideoStateChange((prev: VideoState) => ({
      ...prev,
      currentTime: totalTime,
      currentVideoTime: video.currentTime
    }));

  };

  // Handle video end
  const handleVideoEnd = () => {
    if (videoState.currentVideoIndex < videos.length - 1) {
      // Switch to next video
      const nextIndex = videoState.currentVideoIndex + 1;
      if (videoRef.current) {
        videoRef.current.src = videos[nextIndex].url;
        videoRef.current.currentTime = 0;
      }
      onVideoStateChange((prev: VideoState) => ({
        ...prev,
        currentVideoIndex: nextIndex,
        currentVideoTime: 0
      }));
    } else {
      // End of all videos
      onVideoStateChange((prev: VideoState) => ({ ...prev, isPlaying: false }));
    }
  };

  // Handle seek bar change
  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    onVideoStateChange((prev: VideoState) => ({ ...prev, currentTime: newTime }));
  };

  // Handle speed change
  const handleSpeedChange = (newSpeed: number) => {
    onVideoStateChange((prev: VideoState) => ({ ...prev, playbackRate: newSpeed }));
  };

  // Handle context menu
  const handleContextMenu = (e: React.MouseEvent, eventId: number) => {
    e.preventDefault();
    setShowContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      eventId
    });
    setEditingEventName(eventTypes.find(et => et.id === eventId)?.name || '');
  };

  const handleEventNameChange = () => {
    if (editingEventName.trim()) {
      const newEventName = editingEventName.trim();
      
      // Update event types
      onEventTypesChange(eventTypes.map(et => 
        et.id === showContextMenu.eventId 
          ? { ...et, name: newEventName }
          : et
      ));
      
      // Update all existing timestamps with the new event name
      onTimestampsChange(timestamps.map(t => 
        t.eventId === showContextMenu.eventId 
          ? { ...t, eventName: newEventName }
          : t
      ));
    }
    setShowContextMenu({ show: false, x: 0, y: 0, eventId: 0 });
  };

  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowContextMenu({ show: false, x: 0, y: 0, eventId: 0 });
    };

    if (showContextMenu.show) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showContextMenu.show]);

  const currentVideo = videos[videoState.currentVideoIndex];

  return (
    <Card>
      <Card.Body>
        {videos.length > 0 ? (
          <>
            <video
              ref={videoRef}
              width="100%"
              style={{ maxHeight: '70vh', height: 'auto' }}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleVideoEnd}
              onLoadedMetadata={() => {
                if (videoRef.current) {
                  videoRef.current.currentTime = videoState.currentVideoTime;
                }
              }}
            />
            
            <div className="mt-2">
              <div className="mb-2">
                <small className="text-muted">
                  <strong>Current Video:</strong> {currentVideo?.name}
                </small>
              </div>
              
              {/* Seek bar */}
              <Form.Range
                min={0}
                max={videoState.totalDuration}
                step={0.1}
                value={videoState.currentTime}
                onChange={handleSeekChange}
                className="mb-2"
              />
              
              {/* Time display */}
              <div className="small text-muted mb-2">
                <strong>Wall Time:</strong> {calculateRealWorldTime(videos, videoState.currentTime)} | <strong>Total:</strong> {formatTime(videoState.currentTime)} / {formatTime(videoState.totalDuration)} ({videoState.currentTime.toFixed(1)}s/{videoState.totalDuration.toFixed(1)}s) | <strong>Current:</strong> {formatTime(videoState.currentVideoTime)} / {formatTime(currentVideo?.duration || 0)} ({videoState.currentVideoTime.toFixed(1)}s/{(currentVideo?.duration || 0).toFixed(1)}s)
              </div>
            </div>

            {/* Controls */}
            <div className="video-controls">
              <Row className="align-items-center mb-2">
                <Col xs="auto">
                  <Button
                    variant="outline-light"
                    size="sm"
                    onClick={() => onVideoStateChange((prev: VideoState) => ({ ...prev, isPlaying: !prev.isPlaying }))}
                  >
                    {videoState.isPlaying ? '⏸️' : '▶️'}
                  </Button>
                </Col>
                <Col xs="auto">
                  <Button
                    variant="outline-light"
                    size="sm"
                    onClick={() => onVideoStateChange((prev: VideoState) => ({ ...prev, isMuted: !prev.isMuted }))}
                  >
                    {videoState.isMuted ? '🔇' : '🔊'}
                  </Button>
                </Col>
                <Col>
                  <div className="speed-control">
                    <small className="text-light me-2">Speed</small>
                    <Form.Range
                      min={0.1}
                      max={20}
                      step={0.1}
                      value={videoState.playbackRate}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSpeedChange(parseFloat(e.target.value))}
                      className="ms-2"
                      style={{ width: '150px' }}
                    />
                    <small className="text-light ms-2">{videoState.playbackRate.toFixed(1)}x</small>
                  </div>
                </Col>
              </Row>

              {/* Event buttons */}
              <Row className="mb-2">
                <Col>
                  <div className="d-flex">
                    {eventTypes.map(eventType => (
                      <Button
                        key={eventType.id}
                        variant="outline-light"
                        className="event-button flex-fill me-1"
                        style={{ 
                          backgroundColor: eventType.color, 
                          borderColor: eventType.color, 
                          color: 'white',
                          fontWeight: 'bold',
                          textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                          minHeight: '60px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          alignItems: 'center'
                        }}
                        onClick={() => onEventMark(eventType.id)}
                        onContextMenu={(e) => handleContextMenu(e, eventType.id)}
                      >
                        <div style={{ fontSize: '1.2em', lineHeight: '1' }}>{eventType.id}</div>
                        <div style={{ fontSize: '0.75em', marginTop: '2px', opacity: 0.9 }}>{eventType.name}</div>
                        <div className="event-counter" style={{ fontSize: '0.7em', opacity: 0.8 }}>({eventType.count})</div>
                      </Button>
                    ))}
                  </div>
                </Col>
              </Row>

              {/* Help text */}
              <div className="help-text">
                <small className="text-muted">
                  Keys 1-5: Mark events | Right-click events to rename | Space: Play/pause | i/u: Speed +/- | j/l: Seek ±1s | Shift+j/l: Seek ±10s
                </small>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center text-muted p-5">
            <h5>No videos loaded</h5>
            <p>Click "Add Video" to get started</p>
          </div>
        )}
      </Card.Body>

      {/* Context menu for renaming events */}
      {showContextMenu.show && (
        <div
          style={{
            position: 'fixed',
            top: showContextMenu.y,
            left: showContextMenu.x,
            zIndex: 1000,
            background: 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
            padding: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
          }}
        >
          <Form.Control
            type="text"
            size="sm"
            value={editingEventName}
            onChange={(e) => setEditingEventName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleEventNameChange();
              } else if (e.key === 'Escape') {
                setShowContextMenu({ show: false, x: 0, y: 0, eventId: 0 });
              }
            }}
            placeholder="Event name"
            autoFocus
          />
          <div className="mt-1">
            <Button size="sm" variant="primary" onClick={handleEventNameChange}>
              Save
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};

export default VideoPlayer;
