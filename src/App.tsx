import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { VideoFile, EventType, Timestamp, VideoState } from './types';
import { generateId, getVideoColors, formatTime } from './utils';
import Header from './components/Header';
import VideoUpload from './components/VideoUpload';
import VideoPlayer from './components/VideoPlayer';
import TimestampTable from './components/TimestampTable';
import NoteModal from './components/NoteModal';
import SettingsModal from './components/SettingsModal';
import HelpModal from './components/HelpModal';

const App: React.FC = () => {
  // State management
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = sessionStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  const [videos, setVideos] = useState<VideoFile[]>([]);
  const [videoState, setVideoState] = useState<VideoState>({
    currentTime: 0,
    currentVideoIndex: 0,
    currentVideoTime: 0,
    isPlaying: false,
    isMuted: true,
    playbackRate: 1.0,
    totalDuration: 0
  });

  const [eventTypes, setEventTypes] = useState<EventType[]>(() => {
    const colors = getVideoColors();
    return Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      name: `Event ${i + 1}`,
      color: colors[i],
      count: 0
    }));
  });

  const [timestamps, setTimestamps] = useState<Timestamp[]>([]);
  const [leftPanelWidth, setLeftPanelWidth] = useState<number>(60); // percentage
  const [showNoteModal, setShowNoteModal] = useState<boolean>(false);
  const [editingTimestamp, setEditingTimestamp] = useState<Timestamp | null>(null);
  const [showVideoUpload, setShowVideoUpload] = useState<boolean>(true);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [seekSeconds, setSeekSeconds] = useState<number>(1);
  const [seekSecondsShift, setSeekSecondsShift] = useState<number>(10);

  const resizeRef = useRef<boolean>(false);

  // Dark mode effect
  useEffect(() => {
    document.documentElement.setAttribute('data-bs-theme', darkMode ? 'dark' : 'light');
    sessionStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  // Keyboard event handlers
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    const targetTag = (event.target as HTMLElement)?.tagName?.toLowerCase();
    const targetType = (event.target as HTMLInputElement)?.type?.toLowerCase();
    
    // For event marking (1-5), always allow unless actively typing text
    if (['1', '2', '3', '4', '5'].includes(event.key)) {
      // Only prevent if actively typing in text inputs (not number inputs, ranges, etc.)
      if (targetTag === 'input' && (targetType === 'text' || targetType === 'password' || targetType === 'email')) {
        return;
      }
      if (targetTag === 'textarea') {
        return;
      }
      event.preventDefault();
      // Inline event marking logic
      if (videos.length === 0) return;
      const currentVideo = videos[videoState.currentVideoIndex];
      if (!currentVideo) return;
      const eventType = eventTypes.find(e => e.id === parseInt(event.key));
      if (!eventType) return;

      const newTimestamp = {
        id: Math.random().toString(36).substr(2, 9),
        eventId: parseInt(event.key),
        eventName: eventType.name,
        atSecondFirst: videoState.currentTime,
        atSecondCurrent: videoState.currentVideoTime,
        timeHHMMSS: formatTime(videoState.currentTime),
        videoId: currentVideo.id,
        videoName: currentVideo.name,
        note: ''
      };

      setTimestamps(prev => [...prev, newTimestamp].sort((a, b) => a.atSecondFirst - b.atSecondFirst));
      setEventTypes(prev => prev.map(e => 
        e.id === parseInt(event.key) ? { ...e, count: e.count + 1 } : e
      ));
      return;
    }

    // For space bar (play/pause), always allow unless actively typing text
    if (event.key === ' ') {
      // Only prevent if actively typing in text inputs or textareas
      if (targetTag === 'input' && (targetType === 'text' || targetType === 'password' || targetType === 'email')) {
        return;
      }
      if (targetTag === 'textarea') {
        return;
      }
      event.preventDefault();
      setVideoState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
      return;
    }

    // For other shortcuts, be more restrictive
    if (targetTag === 'input' || targetTag === 'textarea') {
      return; // Don't handle other shortcuts when in any input
    }

    switch (event.key) {
      case 'i':
        event.preventDefault();
        setVideoState(prev => ({ 
          ...prev, 
          playbackRate: Math.min(20, prev.playbackRate + 1) 
        }));
        break;
      case 'u':
        event.preventDefault();
        setVideoState(prev => ({ 
          ...prev, 
          playbackRate: Math.max(-20, prev.playbackRate - 1) 
        }));
        break;
      case 'r':
        event.preventDefault();
        setVideoState(prev => ({ ...prev, playbackRate: -prev.playbackRate }));
        break;
      case 'j':
      case 'J':
        event.preventDefault();
        // Inline seek logic
        const seekAmountJ = event.shiftKey ? -seekSecondsShift : -seekSeconds;
        const newTimeJ = Math.max(0, Math.min(videoState.totalDuration, videoState.currentTime + seekAmountJ));
        setVideoState(prev => ({ ...prev, currentTime: newTimeJ }));
        break;
      case 'l':
      case 'L':
        event.preventDefault();
        // Inline seek logic
        const seekAmountL = event.shiftKey ? seekSecondsShift : seekSeconds;
        const newTimeL = Math.max(0, Math.min(videoState.totalDuration, videoState.currentTime + seekAmountL));
        setVideoState(prev => ({ ...prev, currentTime: newTimeL }));
        break;
      case 'ArrowLeft':
        event.preventDefault();
        // Inline seek logic
        const seekAmountLeft = event.shiftKey ? -seekSecondsShift : -seekSeconds;
        const newTimeLeft = Math.max(0, Math.min(videoState.totalDuration, videoState.currentTime + seekAmountLeft));
        setVideoState(prev => ({ ...prev, currentTime: newTimeLeft }));
        break;
      case 'ArrowRight':
        event.preventDefault();
        // Inline seek logic
        const seekAmountRight = event.shiftKey ? seekSecondsShift : seekSeconds;
        const newTimeRight = Math.max(0, Math.min(videoState.totalDuration, videoState.currentTime + seekAmountRight));
        setVideoState(prev => ({ ...prev, currentTime: newTimeRight }));
        break;
      case 'Backspace':
        event.preventDefault();
        // Inline delete closest timestamp logic
        if (timestamps.length === 0) return;
        const closest = timestamps.reduce((prev, curr) => 
          Math.abs(curr.atSecondFirst - videoState.currentTime) < Math.abs(prev.atSecondFirst - videoState.currentTime) 
            ? curr : prev
        );
        if (window.confirm(`Delete timestamp at ${closest.timeHHMMSS} for ${closest.eventName}?`)) {
          setTimestamps(prev => prev.filter(t => t.id !== closest.id));
          setEventTypes(prev => prev.map(e => 
            e.id === closest.eventId ? { ...e, count: Math.max(0, e.count - 1) } : e
          ));
        }
        break;
    }
  }, [videoState, seekSeconds, seekSecondsShift, videos, eventTypes, timestamps]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Event marking
  const handleEventMark = (eventId: number) => {
    if (videos.length === 0) return;

    const currentVideo = videos[videoState.currentVideoIndex];
    if (!currentVideo) return;

    const eventType = eventTypes.find(e => e.id === eventId);
    if (!eventType) return;

    const newTimestamp: Timestamp = {
      id: generateId(),
      eventId,
      eventName: eventType.name,
      atSecondFirst: videoState.currentTime,
      atSecondCurrent: videoState.currentVideoTime,
      timeHHMMSS: formatTime(videoState.currentTime),
      videoId: currentVideo.id,
      videoName: currentVideo.name,
      note: ''
    };

    setTimestamps(prev => [...prev, newTimestamp].sort((a, b) => a.atSecondFirst - b.atSecondFirst));
    
    // Update event count
    setEventTypes(prev => prev.map(e => 
      e.id === eventId ? { ...e, count: e.count + 1 } : e
    ));
  };

  // Seek video
  const seekVideo = (seconds: number) => {
    const newTime = Math.max(0, Math.min(videoState.totalDuration, videoState.currentTime + seconds));
    setVideoState(prev => ({ ...prev, currentTime: newTime }));
  };

  // Delete closest timestamp
  const handleDeleteClosestTimestamp = () => {
    if (timestamps.length === 0) return;

    const closest = timestamps.reduce((prev, curr) => 
      Math.abs(curr.atSecondFirst - videoState.currentTime) < Math.abs(prev.atSecondFirst - videoState.currentTime) 
        ? curr : prev
    );

    if (window.confirm(`Delete timestamp at ${closest.timeHHMMSS} for ${closest.eventName}?`)) {
      setTimestamps(prev => prev.filter(t => t.id !== closest.id));
      
      // Update event count
      setEventTypes(prev => prev.map(e => 
        e.id === closest.eventId ? { ...e, count: Math.max(0, e.count - 1) } : e
      ));
    }
  };

  // Handle resize
  const handleMouseDown = (e: React.MouseEvent) => {
    resizeRef.current = true;
    e.preventDefault();
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!resizeRef.current) return;
    
    const containerWidth = window.innerWidth;
    const newWidth = Math.max(30, Math.min(80, (e.clientX / containerWidth) * 100));
    setLeftPanelWidth(newWidth);
  }, []);

  const handleMouseUp = useCallback(() => {
    resizeRef.current = false;
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <div className="app-container">
      <Header 
        darkMode={darkMode} 
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        showVideoUpload={showVideoUpload}
        onToggleVideoUpload={() => setShowVideoUpload(!showVideoUpload)}
        onShowSettings={() => setShowSettingsModal(true)}
        onShowHelp={() => setShowHelpModal(true)}
      />
      
      <Container fluid className="main-content p-0">
        <div className={`video-upload-section ${showVideoUpload ? '' : 'collapsed'}`}>
          <div className="p-3">
            <VideoUpload 
              videos={videos}
              onVideosChange={setVideos}
              onVideoStateChange={setVideoState}
              timestamps={timestamps}
            />
          </div>
        </div>
        
        <Row className="g-0" style={{ height: showVideoUpload ? 'calc(100% - 200px)' : '100%' }}>
          <Col style={{ width: `${leftPanelWidth}%`, maxWidth: `${leftPanelWidth}%` }}>
            <VideoPlayer
              videos={videos}
              videoState={videoState}
              onVideoStateChange={setVideoState}
              eventTypes={eventTypes}
              onEventTypesChange={setEventTypes}
              onEventMark={handleEventMark}
            />
          </Col>
          
          <div 
            className="resize-handle"
            onMouseDown={handleMouseDown}
            style={{ cursor: 'col-resize' }}
          />
          
          <Col style={{ width: `${100 - leftPanelWidth}%`, maxWidth: `${100 - leftPanelWidth}%` }}>
            <TimestampTable
              timestamps={timestamps}
              onTimestampsChange={setTimestamps}
              eventTypes={eventTypes}
              currentTime={videoState.currentTime}
      onSeekTo={(time: number) => setVideoState(prev => ({ ...prev, currentTime: time }))}
      onEditNote={(timestamp: Timestamp) => {
                setEditingTimestamp(timestamp);
                setShowNoteModal(true);
              }}
            />
          </Col>
        </Row>
      </Container>

      <NoteModal
        show={showNoteModal}
        timestamp={editingTimestamp}
        onHide={() => {
          setShowNoteModal(false);
          setEditingTimestamp(null);
        }}
        onSave={(note: string) => {
          if (editingTimestamp) {
            setTimestamps(prev => prev.map(t => 
              t.id === editingTimestamp.id ? { ...t, note } : t
            ));
          }
          setShowNoteModal(false);
          setEditingTimestamp(null);
        }}
      />

      <SettingsModal
        show={showSettingsModal}
        onHide={() => setShowSettingsModal(false)}
        seekSeconds={seekSeconds}
        seekSecondsShift={seekSecondsShift}
        onSeekSecondsChange={setSeekSeconds}
        onSeekSecondsShiftChange={setSeekSecondsShift}
      />

      <HelpModal
        show={showHelpModal}
        onHide={() => setShowHelpModal(false)}
      />
    </div>
  );
};

export default App;
