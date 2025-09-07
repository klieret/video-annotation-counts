import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { VideoFile, EventType, Timestamp, VideoState } from './types';
import { generateId, getVideoColors, calculateRealWorldTime } from './utils';
import Header, { TabType } from './components/Header';
import VideoUpload from './components/VideoUpload';
import VideoPlayer from './components/VideoPlayer';
import TimestampTable, { TimestampTableRef } from './components/TimestampTable';
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
  const [activeTab, setActiveTab] = useState<TabType>('video-selection');
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [seekSeconds, setSeekSeconds] = useState<number>(1);
  const [seekSecondsShift, setSeekSecondsShift] = useState<number>(10);

  const resizeRef = useRef<boolean>(false);
  const pressedKeysRef = useRef<Set<string>>(new Set());
  const annotationTableRef = useRef<TimestampTableRef>(null);
  const resultsTableRef = useRef<TimestampTableRef>(null);

  // Dark mode effect
  useEffect(() => {
    document.documentElement.setAttribute('data-bs-theme', darkMode ? 'dark' : 'light');
    sessionStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  // Keyboard event handlers
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    const targetTag = (event.target as HTMLElement)?.tagName?.toLowerCase();
    const targetType = (event.target as HTMLInputElement)?.type?.toLowerCase();
    
    // Prevent key repeat for event marking keys
    if (['1', '2', '3', '4', '5'].includes(event.key)) {
      if (pressedKeysRef.current.has(event.key)) {
        return; // Key is already pressed, ignore repeat
      }
      pressedKeysRef.current.add(event.key);
      
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
        timeHHMMSS: calculateRealWorldTime(videos, videoState.currentTime),
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

    // For other shortcuts, be more restrictive but allow range inputs (sliders)
    if (targetTag === 'input' && targetType !== 'range') {
      return; // Don't handle shortcuts when in text inputs, but allow range inputs
    }
    if (targetTag === 'textarea') {
      return; // Don't handle shortcuts when in textarea
    }

    switch (event.key) {
      case 'v':
      case 'V':
        event.preventDefault();
        setActiveTab('video-selection');
        break;
      case 'a':
      case 'A':
        event.preventDefault();
        setActiveTab('annotation');
        break;
      case 'r':
      case 'R':
        event.preventDefault();
        setActiveTab('results');
        break;
      case 'n':
      case 'N':
        event.preventDefault();
        // Add note to the last event
        if (timestamps.length > 0) {
          const lastTimestamp = timestamps[timestamps.length - 1];
          // Trigger inline editing in the appropriate table based on current tab
          if (activeTab === 'annotation' && annotationTableRef.current) {
            annotationTableRef.current.triggerInlineEdit(lastTimestamp.id);
          } else if (activeTab === 'results' && resultsTableRef.current) {
            resultsTableRef.current.triggerInlineEdit(lastTimestamp.id);
          }
        }
        break;
      case '?':
        event.preventDefault();
        setShowHelpModal(true);
        break;
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
          playbackRate: Math.max(0.1, prev.playbackRate - 1) 
        }));
        break;
      case 'j':
      case 'J':
        event.preventDefault();
        // Inline seek logic
        const seekAmountJ = event.shiftKey ? -seekSecondsShift : -seekSeconds;
        const newTimeJ = Math.max(0, Math.min(videoState.totalDuration, videoState.currentTime + seekAmountJ));
        setVideoState(prev => ({ ...prev, currentTime: newTimeJ, isPlaying: false }));
        break;
      case 'l':
      case 'L':
        event.preventDefault();
        // Inline seek logic
        const seekAmountL = event.shiftKey ? seekSecondsShift : seekSeconds;
        const newTimeL = Math.max(0, Math.min(videoState.totalDuration, videoState.currentTime + seekAmountL));
        setVideoState(prev => ({ ...prev, currentTime: newTimeL, isPlaying: false }));
        break;
      case 'ArrowLeft':
        event.preventDefault();
        // Inline seek logic
        const seekAmountLeft = event.shiftKey ? -seekSecondsShift : -seekSeconds;
        const newTimeLeft = Math.max(0, Math.min(videoState.totalDuration, videoState.currentTime + seekAmountLeft));
        setVideoState(prev => ({ ...prev, currentTime: newTimeLeft, isPlaying: false }));
        break;
      case 'ArrowRight':
        event.preventDefault();
        // Inline seek logic
        const seekAmountRight = event.shiftKey ? seekSecondsShift : seekSeconds;
        const newTimeRight = Math.max(0, Math.min(videoState.totalDuration, videoState.currentTime + seekAmountRight));
        setVideoState(prev => ({ ...prev, currentTime: newTimeRight, isPlaying: false }));
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

  // Handle key up to clear pressed keys
  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    if (['1', '2', '3', '4', '5'].includes(event.key)) {
      pressedKeysRef.current.delete(event.key);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    document.addEventListener('keyup', handleKeyUp);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyPress, handleKeyUp]);

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
      timeHHMMSS: calculateRealWorldTime(videos, videoState.currentTime),
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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'video-selection':
        return (
          <Container fluid className="p-4">
            <VideoUpload 
              videos={videos}
              onVideosChange={setVideos}
              onVideoStateChange={setVideoState}
              timestamps={timestamps}
              onTimestampsChange={setTimestamps}
            />
          </Container>
        );
      
      case 'annotation':
        return (
          <Container fluid className="main-content p-0">
            <Row className="g-0" style={{ height: '100%' }}>
              <Col style={{ width: `${leftPanelWidth}%`, maxWidth: `${leftPanelWidth}%` }}>
                <VideoPlayer
                  videos={videos}
                  videoState={videoState}
                  onVideoStateChange={setVideoState}
                  eventTypes={eventTypes}
                  onEventTypesChange={setEventTypes}
                  onEventMark={handleEventMark}
                  timestamps={timestamps}
                  onTimestampsChange={setTimestamps}
                />
              </Col>
              
              <div 
                className="resize-handle"
                onMouseDown={handleMouseDown}
                style={{ cursor: 'col-resize' }}
              />
              
              <Col style={{ width: `${100 - leftPanelWidth}%`, maxWidth: `${100 - leftPanelWidth}%` }}>
                <TimestampTable
                  ref={annotationTableRef}
                  timestamps={timestamps}
                  onTimestampsChange={setTimestamps}
                  eventTypes={eventTypes}
                  currentTime={videoState.currentTime}
                  onSeekTo={(time: number) => {
                    setVideoState(prev => ({ ...prev, currentTime: time }));
                    setActiveTab('annotation');
                  }}
                  onEditNote={(timestamp: Timestamp) => {
                    setEditingTimestamp(timestamp);
                    setShowNoteModal(true);
                  }}
                />
              </Col>
            </Row>
          </Container>
        );
      
      case 'results':
        return (
          <Container fluid className="p-4">
            <TimestampTable
              ref={resultsTableRef}
              timestamps={timestamps}
              onTimestampsChange={setTimestamps}
              eventTypes={eventTypes}
              currentTime={videoState.currentTime}
              onSeekTo={(time: number) => {
                setVideoState(prev => ({ ...prev, currentTime: time }));
                setActiveTab('annotation');
              }}
              onEditNote={(timestamp: Timestamp) => {
                setEditingTimestamp(timestamp);
                setShowNoteModal(true);
              }}
              isFullscreen={true}
            />
          </Container>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="app-container">
      <Header 
        darkMode={darkMode} 
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onShowSettings={() => setShowSettingsModal(true)}
        onShowHelp={() => setShowHelpModal(true)}
      />
      
      {renderTabContent()}

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
