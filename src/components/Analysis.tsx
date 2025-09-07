import React, { useState, useMemo } from 'react';
import { Container, Row, Col, Card, Form, Table, Alert } from 'react-bootstrap';
import { Timestamp, EventType, VideoState } from '../types';

interface AnalysisProps {
  timestamps: Timestamp[];
  eventTypes: EventType[];
  videoState: VideoState;
}

interface HistogramBin {
  startTime: number;
  endTime: number;
  count: number;
  label: string;
}

const Analysis: React.FC<AnalysisProps> = ({ timestamps, eventTypes, videoState }) => {
  // Simple Counter state
  const [timeRangeStart, setTimeRangeStart] = useState<number>(0);
  const [timeRangeEnd, setTimeRangeEnd] = useState<number>(videoState.totalDuration || 0);
  
  // Histogram state
  const [histogramTimeStart, setHistogramTimeStart] = useState<number>(0);
  const [histogramTimeEnd, setHistogramTimeEnd] = useState<number>(videoState.totalDuration || 0);
  const [binSizeMinutes, setBinSizeMinutes] = useState<number>(5);
  const [selectedEventId, setSelectedEventId] = useState<number>(1);

  // Update range ends when total duration changes
  React.useEffect(() => {
    if (videoState.totalDuration > 0) {
      setTimeRangeEnd(videoState.totalDuration);
      setHistogramTimeEnd(videoState.totalDuration);
    }
  }, [videoState.totalDuration]);

  // Simple Counter calculations
  const simpleCounterData = useMemo(() => {
    const filteredTimestamps = timestamps.filter(
      t => t.atSecondFirst >= timeRangeStart && t.atSecondFirst <= timeRangeEnd
    );

    return eventTypes.map(eventType => {
      const count = filteredTimestamps.filter(t => t.eventId === eventType.id).length;
      return {
        ...eventType,
        count
      };
    });
  }, [timestamps, eventTypes, timeRangeStart, timeRangeEnd]);

  // Histogram calculations
  const histogramData = useMemo(() => {
    const binSizeSeconds = binSizeMinutes * 60;
    const timeRange = histogramTimeEnd - histogramTimeStart;
    const numBins = Math.ceil(timeRange / binSizeSeconds);
    
    const bins: HistogramBin[] = [];
    
    for (let i = 0; i < numBins; i++) {
      const startTime = histogramTimeStart + (i * binSizeSeconds);
      const endTime = Math.min(histogramTimeStart + ((i + 1) * binSizeSeconds), histogramTimeEnd);
      
      const startMinutes = Math.floor(startTime / 60);
      const endMinutes = Math.floor(endTime / 60);
      const startHours = Math.floor(startMinutes / 60);
      const endHours = Math.floor(endMinutes / 60);
      
      const formatTime = (totalSeconds: number) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = Math.floor(totalSeconds % 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      };
      
      const label = `${formatTime(startTime)} - ${formatTime(endTime)}`;
      
      const count = timestamps.filter(
        t => t.eventId === selectedEventId && 
             t.atSecondFirst >= startTime && 
             t.atSecondFirst < endTime
      ).length;
      
      bins.push({
        startTime,
        endTime,
        count,
        label
      });
    }
    
    return bins;
  }, [timestamps, histogramTimeStart, histogramTimeEnd, binSizeMinutes, selectedEventId]);

  const maxHistogramCount = Math.max(...histogramData.map(bin => bin.count), 1);
  const selectedEvent = eventTypes.find(e => e.id === selectedEventId);

  const formatTimeForSlider = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (timestamps.length === 0) {
    return (
      <Container fluid className="p-4">
        <Alert variant="info">
          <Alert.Heading>No Data Available</Alert.Heading>
          <p>No timestamps have been recorded yet. Please add some events in the Annotation tab first.</p>
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="p-4">
      <Row className="g-4">
        {/* Simple Counter */}
        <Col lg={6}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">📊 Simple Counter</h5>
            </Card.Header>
            <Card.Body>
              <Form className="mb-3">
                <Row className="g-3">
                  <Col>
                    <Form.Label>Start Time: {formatTimeForSlider(timeRangeStart)}</Form.Label>
                    <Form.Range
                      min={0}
                      max={videoState.totalDuration}
                      step={1}
                      value={timeRangeStart}
                      onChange={(e) => {
                        const newStart = Number(e.target.value);
                        if (newStart <= timeRangeEnd) {
                          setTimeRangeStart(newStart);
                        }
                      }}
                    />
                  </Col>
                  <Col>
                    <Form.Label>End Time: {formatTimeForSlider(timeRangeEnd)}</Form.Label>
                    <Form.Range
                      min={0}
                      max={videoState.totalDuration}
                      step={1}
                      value={timeRangeEnd}
                      onChange={(e) => {
                        const newEnd = Number(e.target.value);
                        if (newEnd >= timeRangeStart) {
                          setTimeRangeEnd(newEnd);
                        }
                      }}
                    />
                  </Col>
                </Row>
              </Form>

              <Table striped bordered hover size="sm">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Count</th>
                  </tr>
                </thead>
                <tbody>
                  {simpleCounterData.map(event => (
                    <tr key={event.id}>
                      <td>
                        <span style={{ color: event.color, fontWeight: 'bold' }}>
                          {event.name}
                        </span>
                      </td>
                      <td>
                        <strong>{event.count}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>

              <div className="mt-3">
                <small className="text-muted">
                  Total events in range: <strong>{simpleCounterData.reduce((sum, e) => sum + e.count, 0)}</strong>
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Histogram */}
        <Col lg={6}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">📈 Histogram Count</h5>
            </Card.Header>
            <Card.Body>
              <Form className="mb-3">
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Label>Start Time: {formatTimeForSlider(histogramTimeStart)}</Form.Label>
                    <Form.Range
                      min={0}
                      max={videoState.totalDuration}
                      step={1}
                      value={histogramTimeStart}
                      onChange={(e) => {
                        const newStart = Number(e.target.value);
                        if (newStart <= histogramTimeEnd) {
                          setHistogramTimeStart(newStart);
                        }
                      }}
                    />
                  </Col>
                  <Col md={6}>
                    <Form.Label>End Time: {formatTimeForSlider(histogramTimeEnd)}</Form.Label>
                    <Form.Range
                      min={0}
                      max={videoState.totalDuration}
                      step={1}
                      value={histogramTimeEnd}
                      onChange={(e) => {
                        const newEnd = Number(e.target.value);
                        if (newEnd >= histogramTimeStart) {
                          setHistogramTimeEnd(newEnd);
                        }
                      }}
                    />
                  </Col>
                  <Col md={6}>
                    <Form.Label>Bin Size (minutes)</Form.Label>
                    <Form.Control
                      type="number"
                      min={1}
                      max={60}
                      value={binSizeMinutes}
                      onChange={(e) => setBinSizeMinutes(Number(e.target.value))}
                    />
                  </Col>
                  <Col md={6}>
                    <Form.Label>Event Type</Form.Label>
                    <Form.Select
                      value={selectedEventId}
                      onChange={(e) => setSelectedEventId(Number(e.target.value))}
                    >
                      {eventTypes.map(event => (
                        <option key={event.id} value={event.id}>
                          {event.name}
                        </option>
                      ))}
                    </Form.Select>
                  </Col>
                </Row>
              </Form>

              {/* Visual Histogram */}
              <div className="mb-3">
                <h6 style={{ color: selectedEvent?.color }}>
                  {selectedEvent?.name} Distribution
                </h6>
                <div 
                  style={{ 
                    height: '250px', 
                    border: '1px solid #dee2e6',
                    borderRadius: '4px',
                    padding: '10px',
                    position: 'relative',
                    backgroundColor: 'var(--bs-body-bg)'
                  }}
                >
                  {/* Y-axis labels */}
                  <div 
                    style={{ 
                      position: 'absolute',
                      left: '0',
                      top: '10px',
                      bottom: '30px',
                      width: '40px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      alignItems: 'flex-end',
                      paddingRight: '5px'
                    }}
                  >
                    {Array.from({ length: 6 }, (_, i) => {
                      const value = Math.round((maxHistogramCount * (5 - i)) / 5);
                      return (
                        <div key={i} style={{ fontSize: '0.7rem', color: 'var(--bs-secondary)' }}>
                          {value}
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Chart area */}
                  <div 
                    style={{ 
                      marginLeft: '45px',
                      marginBottom: '25px',
                      height: 'calc(100% - 35px)',
                      display: 'flex',
                      alignItems: 'flex-end',
                      gap: '2px',
                      overflowX: 'auto'
                    }}
                  >
                    {histogramData.map((bin, index) => (
                      <div
                        key={index}
                        style={{
                          minWidth: `${Math.max(20, 300 / histogramData.length)}px`,
                          height: `${maxHistogramCount > 0 ? (bin.count / maxHistogramCount) * 100 : 0}%`,
                          backgroundColor: selectedEvent?.color || '#6c757d',
                          borderRadius: '2px 2px 0 0',
                          position: 'relative',
                          transition: 'height 0.3s ease'
                        }}
                        title={`${bin.label}: ${bin.count} events`}
                      >
                        {/* Count label on top of bar */}
                        {bin.count > 0 && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '-20px',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              fontSize: '0.7rem',
                              fontWeight: 'bold',
                              color: 'var(--bs-body-color)',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {bin.count}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {/* X-axis labels */}
                  <div 
                    style={{ 
                      position: 'absolute',
                      bottom: '0',
                      left: '45px',
                      right: '10px',
                      height: '20px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ fontSize: '0.7rem', color: 'var(--bs-secondary)' }}>
                      Time →
                    </div>
                  </div>
                  
                  {/* Y-axis label */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '5px',
                      top: '50%',
                      transform: 'rotate(-90deg) translateY(-50%)',
                      transformOrigin: 'center',
                      fontSize: '0.7rem',
                      color: 'var(--bs-secondary)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Count
                  </div>
                </div>
              </div>

              {/* Histogram Table */}
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                <Table striped bordered hover size="sm">
                  <thead>
                    <tr>
                      <th>Time Range</th>
                      <th>Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {histogramData.map((bin, index) => (
                      <tr key={index}>
                        <td style={{ fontSize: '0.8rem' }}>
                          {bin.label}
                        </td>
                        <td>
                          <strong>{bin.count}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>

              <div className="mt-3">
                <small className="text-muted">
                  Total <span style={{ color: selectedEvent?.color }}>{selectedEvent?.name}</span> events: 
                  <strong> {histogramData.reduce((sum, bin) => sum + bin.count, 0)}</strong>
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Analysis;
