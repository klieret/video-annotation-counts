import React, { useEffect, useRef } from 'react';
import { Card, Table, Button, Dropdown, Row, Col } from 'react-bootstrap';
import { Timestamp, EventType } from '../types';
import { exportToCSV } from '../utils';

interface TimestampTableProps {
  timestamps: Timestamp[];
  onTimestampsChange: (timestamps: Timestamp[]) => void;
  eventTypes: EventType[];
  currentTime: number;
  onSeekTo: (time: number) => void;
  onEditNote: (timestamp: Timestamp) => void;
  isFullscreen?: boolean;
}

const TimestampTable: React.FC<TimestampTableProps> = ({
  timestamps,
  onTimestampsChange,
  eventTypes,
  currentTime,
  onSeekTo,
  onEditNote,
  isFullscreen = false
}) => {
  const activeRowRef = useRef<HTMLTableRowElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Find closest timestamp to current time
  const closestTimestamp = timestamps.reduce((closest, current) => {
    if (!closest) return current;
    return Math.abs(current.atSecondFirst - currentTime) < Math.abs(closest.atSecondFirst - currentTime)
      ? current : closest;
  }, null as Timestamp | null);

  // Auto-scroll to active timestamp within the table container only
  useEffect(() => {
    if (activeRowRef.current && tableContainerRef.current) {
      const container = tableContainerRef.current;
      const row = activeRowRef.current;
      
      const containerRect = container.getBoundingClientRect();
      const rowRect = row.getBoundingClientRect();
      
      // Check if row is outside the visible area of the container
      const isAbove = rowRect.top < containerRect.top;
      const isBelow = rowRect.bottom > containerRect.bottom;
      
      if (isAbove || isBelow) {
        // Calculate the scroll position to center the row in the container
        const rowOffsetTop = row.offsetTop;
        const containerHeight = container.clientHeight;
        const rowHeight = row.clientHeight;
        
        const targetScrollTop = rowOffsetTop - (containerHeight / 2) + (rowHeight / 2);
        
        container.scrollTo({
          top: Math.max(0, targetScrollTop),
          behavior: 'smooth'
        });
      }
    }
  }, [closestTimestamp?.id]);

  const handleDeleteTimestamp = (timestampId: string) => {
    if (window.confirm('Delete this timestamp?')) {
      onTimestampsChange(timestamps.filter(t => t.id !== timestampId));
    }
  };

  const handleEventTypeChange = (timestampId: string, newEventId: number) => {
    const eventType = eventTypes.find(e => e.id === newEventId);
    if (!eventType) return;

    onTimestampsChange(timestamps.map(t => 
      t.id === timestampId 
        ? { ...t, eventId: newEventId, eventName: eventType.name }
        : t
    ));
  };

  const handleExportCSV = () => {
    exportToCSV(timestamps);
  };

  const getEventColor = (eventId: number): string => {
    return eventTypes.find(e => e.id === eventId)?.color || '#6c757d';
  };

  const CompactTable = () => (
    <div className="timestamp-table" ref={tableContainerRef}>
      <Table striped bordered hover size="sm">
        <thead>
          <tr>
            <th style={{ width: '120px' }}>Event</th>
            <th>Time</th>
            <th>Note</th>
            <th style={{ width: '120px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {timestamps.map((timestamp, index) => {
            // Drop up if it's one of the last 2 items to prevent cutoff
            const dropDirection = index >= timestamps.length - 2 ? "up" : "down";
            
            return (
              <tr
                key={timestamp.id}
                ref={closestTimestamp?.id === timestamp.id ? activeRowRef : null}
                className={`timestamp-row ${closestTimestamp?.id === timestamp.id ? 'active' : ''}`}
              >
                <td>
                  <Dropdown drop={dropDirection}>
                    <Dropdown.Toggle
                      variant="link"
                      size="sm"
                      style={{ 
                        color: getEventColor(timestamp.eventId),
                        textDecoration: 'none',
                        padding: '0',
                        border: 'none',
                        whiteSpace: 'nowrap',
                        fontWeight: 'bold',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {timestamp.eventName}
                    </Dropdown.Toggle>
                    <Dropdown.Menu style={{ zIndex: 1050 }}>
                      {eventTypes.map(eventType => (
                        <Dropdown.Item
                          key={eventType.id}
                          onClick={() => handleEventTypeChange(timestamp.id, eventType.id)}
                          style={{ color: eventType.color }}
                        >
                          {eventType.id} - {eventType.name}
                        </Dropdown.Item>
                      ))}
                    </Dropdown.Menu>
                  </Dropdown>
                </td>
              <td>
                <small>{timestamp.timeHHMMSS}</small>
              </td>
              <td>
                <small className="text-muted" style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {timestamp.note || '-'}
                </small>
              </td>
              <td>
                <div className="d-flex gap-1">
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => onSeekTo(timestamp.atSecondFirst)}
                    title="Go to timestamp"
                  >
                    ➤
                  </Button>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => onEditNote(timestamp)}
                    title="Add/edit note"
                  >
                    ✏️
                  </Button>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => handleDeleteTimestamp(timestamp.id)}
                    title="Delete timestamp"
                  >
                    🗑️
                  </Button>
                </div>
              </td>
            </tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );

  const FullTable = () => (
    <Table striped bordered hover>
      <thead>
        <tr>
          <th>Event</th>
          <th>Event Name</th>
          <th>Time (HH:MM:SS)</th>
          <th>Time (seconds)</th>
          <th>Video</th>
          <th>Note</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {timestamps.map(timestamp => (
          <tr key={timestamp.id}>
            <td style={{ color: getEventColor(timestamp.eventId) }}>
              {timestamp.eventId}
            </td>
            <td>{timestamp.eventName}</td>
            <td>{timestamp.timeHHMMSS}</td>
            <td>{timestamp.atSecondFirst.toFixed(1)}</td>
            <td>
              <div className="d-flex align-items-center">
                <div 
                  className="video-indicator me-2"
                  style={{ backgroundColor: getEventColor(timestamp.eventId) }}
                />
                {timestamp.videoName}
              </div>
            </td>
            <td>
              <small>{timestamp.note || '-'}</small>
            </td>
            <td>
              <div className="d-flex gap-1">
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => onSeekTo(timestamp.atSecondFirst)}
                  title="Go to timestamp"
                >
                  ➤
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => onEditNote(timestamp)}
                  title="Add/edit note"
                >
                  ✏️
                </Button>
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => handleDeleteTimestamp(timestamp.id)}
                  title="Delete timestamp"
                >
                  🗑️
                </Button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );

  if (isFullscreen) {
    return (
      <Card style={{ height: '100%' }}>
        <Card.Header>
          <Row className="align-items-center">
            <Col>
              <h6 className="mb-0">
                All Timestamp Data ({timestamps.length})
              </h6>
            </Col>
            <Col xs="auto">
              <Button
                variant="outline-success"
                size="sm"
                onClick={handleExportCSV}
                disabled={timestamps.length === 0}
              >
                📥 Export CSV
              </Button>
            </Col>
          </Row>
        </Card.Header>
        <Card.Body className="p-0" style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
          {timestamps.length > 0 ? (
            <FullTable />
          ) : (
            <div className="text-center text-muted p-4">
              <p>No timestamps recorded yet</p>
              <small>Use number keys 1-5 to mark events in the Annotation tab</small>
            </div>
          )}
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card style={{ height: '100%' }}>
      <Card.Header>
        <Row className="align-items-center">
          <Col>
            <h6 className="mb-0">
              Timestamps ({timestamps.length})
            </h6>
          </Col>
          <Col xs="auto">
            <Button
              variant="outline-success"
              size="sm"
              onClick={handleExportCSV}
              disabled={timestamps.length === 0}
            >
              📥 CSV
            </Button>
          </Col>
        </Row>
      </Card.Header>
      <Card.Body className="p-0">
        {timestamps.length > 0 ? (
          <CompactTable />
        ) : (
          <div className="text-center text-muted p-4">
            <p>No timestamps recorded yet</p>
            <small>Use number keys 1-5 to mark events</small>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default TimestampTable;
