import React, { useState } from 'react';
import { Modal, Button, Form, Row, Col } from 'react-bootstrap';

interface SettingsModalProps {
  show: boolean;
  onHide: () => void;
  seekSeconds: number;
  seekSecondsShift: number;
  onSeekSecondsChange: (seconds: number) => void;
  onSeekSecondsShiftChange: (seconds: number) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  show,
  onHide,
  seekSeconds,
  seekSecondsShift,
  onSeekSecondsChange,
  onSeekSecondsShiftChange
}) => {
  const [localSeekSeconds, setLocalSeekSeconds] = useState(seekSeconds);
  const [localSeekSecondsShift, setLocalSeekSecondsShift] = useState(seekSecondsShift);

  const handleSave = () => {
    onSeekSecondsChange(localSeekSeconds);
    onSeekSecondsShiftChange(localSeekSecondsShift);
    onHide();
  };

  const handleCancel = () => {
    setLocalSeekSeconds(seekSeconds);
    setLocalSeekSecondsShift(seekSecondsShift);
    onHide();
  };

  return (
    <Modal show={show} onHide={handleCancel} centered>
      <Modal.Header closeButton>
        <Modal.Title>Settings</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Row className="mb-3">
            <Col>
              <Form.Label>J/L Seeking (seconds)</Form.Label>
              <Form.Control
                type="number"
                min="1"
                max="60"
                value={localSeekSeconds}
                onChange={(e) => setLocalSeekSeconds(parseInt(e.target.value) || 1)}
                onKeyDown={(e) => e.stopPropagation()}
              />
              <Form.Text className="text-muted">
                How many seconds to seek when pressing J or L keys
              </Form.Text>
            </Col>
          </Row>
          <Row className="mb-3">
            <Col>
              <Form.Label>Shift + J/L Seeking (seconds)</Form.Label>
              <Form.Control
                type="number"
                min="1"
                max="300"
                value={localSeekSecondsShift}
                onChange={(e) => setLocalSeekSecondsShift(parseInt(e.target.value) || 10)}
                onKeyDown={(e) => e.stopPropagation()}
              />
              <Form.Text className="text-muted">
                How many seconds to seek when pressing Shift + J or Shift + L keys
              </Form.Text>
            </Col>
          </Row>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleCancel}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave}>
          Save Changes
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default SettingsModal;
