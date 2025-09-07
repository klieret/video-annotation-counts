import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { Timestamp } from '../types';

interface NoteModalProps {
  show: boolean;
  timestamp: Timestamp | null;
  onHide: () => void;
  onSave: (note: string) => void;
}

const NoteModal: React.FC<NoteModalProps> = ({ show, timestamp, onHide, onSave }) => {
  const [note, setNote] = useState<string>('');

  useEffect(() => {
    if (timestamp) {
      setNote(timestamp.note || '');
    }
  }, [timestamp]);

  const handleSave = () => {
    onSave(note);
    setNote('');
  };

  const handleCancel = () => {
    setNote('');
    onHide();
  };

  return (
    <Modal show={show} onHide={handleCancel} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          {timestamp ? `Note for ${timestamp.eventName} at ${timestamp.timeHHMMSS}` : 'Add Note'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group>
            <Form.Label>Note</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Enter your note here..."
              autoFocus
            />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleCancel}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave}>
          Save Note
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default NoteModal;
