import React, { useState, useEffect, useRef } from 'react';
import { Card, Table, Button, Dropdown, Modal, Row, Col } from 'react-bootstrap';
import { Timestamp, EventType } from '../types';
import { exportToCSV, formatTime } from '../utils';

interface TimestampTableProps {
  timestamps: Timestamp[];
  onTimestampsChange: (timestamps: Timestamp[]) => void;
  eventTypes: EventType[];
  currentTime: number;
  onSeekTo: (time: number) => void;
  onEditNote: (timestamp: Timestamp) => void;
}

const TimestampTable: React.FC<TimestampTableProps> = ({
  timestamps,
  onTimestampsChange,
  eventTypes,
  currentTime,
  onSeekTo,
  onEditNote
}) => {
  const [showFullModal, setShowFullModal] = useState<boolean>(false);
  const activeRowRef = useRef<HTMLTableRowElement>(null);

  // Find closest timestamp to current time
  const closestTimestamp = timestamps.reduce((closest, current) => {
    if (!closest) return current;
    return Math.abs(current.atSecondFirst - currentTime) < Math.abs(closest.atSecondFirst - currentTime)
      ? current : closest;
  }, null as Timestamp | null);

  // Auto-scroll to active timestamp
  useEffect(() => {
    if (activeRowRef.current) {
      activeRowRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
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
    <div className="timestamp-table">
      <Table striped bordered hover size="sm">
        <thead>
          <tr>
            <th style={{ width: '60px' }}>Event</th>
            <th>Time</th>
            <th style={{ width: '120px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {timestamps.map(timestamp => (
            <tr
              key={timestamp.id}
              ref={closestTimestamp?.id === timestamp.id ? activeRowRef : null}
              className={`timestamp-row ${closestTimestamp?.id === timestamp.id ? 'active' : ''}`}
            >
              <td>
                <Dropdown>
                  <Dropdown.Toggle
                    variant="link"
                    size="sm"
                    style={{ 
                      color: getEventColor(timestamp.eventId),
                      textDecoration: 'none',
                      padding: '0',
                      border: 'none'
                    }}
                  >
                    {timestamp.eventId}
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
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

  return (
    <>
      <Card style={{ height: '100%' }}>
        <Card.Header>
          <Row className="align-items-center">
            <Col>
              <h6 className="mb-0">
                Timestamps ({timestamps.length})
              </h6>
            </Col>
            <Col xs="auto">
              <div className="d-flex gap-2">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => setShowFullModal(true)}
                  disabled={timestamps.length === 0}
                >
                  📋 Expand
                </Button>
                <Button
                  variant="outline-success"
                  size="sm"
                  onClick={handleExportCSV}
                  disabled={timestamps.length === 0}
                >
                  📥 CSV
                </Button>
              </div>
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

      {/* Full data modal */}
      <Modal show={showFullModal} onHide={() => setShowFullModal(false)} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>All Timestamp Data</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <FullTable />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-success" onClick={handleExportCSV}>
            📥 Export CSV
          </Button>
          <Button variant="secondary" onClick={() => setShowFullModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default TimestampTable;
