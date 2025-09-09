import React from 'react';
import { Modal, Button, Table } from 'react-bootstrap';

interface HelpModalProps {
  show: boolean;
  onHide: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ show, onHide }) => {
  const shortcutCategories = {
    general: [
      { key: 'u', description: 'Switch to Setup tab' },
      { key: 's', description: 'Save session' },
      { key: 'a', description: 'Switch to Annotation tab' },
      { key: 'r', description: 'Switch to Results tab' },
      { key: 'y', description: 'Switch to Analysis tab' },
      { key: '?', description: 'Show help & keyboard shortcuts' }
    ],
    videoPlayback: [
      { key: 'Space', description: 'Play/pause video' },
      { key: 'i', description: 'Increase playback speed by 1.0x' },
      { key: 'o', description: 'Decrease playback speed by 1.0x' },
      { key: 'j / ←', description: 'Seek backward (configurable, default 1 second)' },
      { key: 'l / →', description: 'Seek forward (configurable, default 1 second)' },
      { key: 'Shift + j / Shift + ←', description: 'Seek backward (configurable, default 10 seconds)' },
      { key: 'Shift + l / Shift + →', description: 'Seek forward (configurable, default 10 seconds)' }
    ],
    annotation: [
      { key: '1-5', description: 'Mark events (works even when other controls are focused)' },
      { key: 'n', description: 'Add note to the last marked event' },
      { key: 'Backspace', description: 'Delete closest timestamp to current position' }
    ]
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Help & Keyboard Shortcuts</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="mb-4">
          <h5>Getting Started</h5>
          <ul>
            <li><strong>Load Videos:</strong> Click "Add Video" to select one or more video files</li>
            <li><strong>Multiple Videos:</strong> Load multiple videos to create one continuous timeline</li>
            <li><strong>Start Time:</strong> Set the real-world start time for the first video (auto-inferred from filename when possible)</li>
            <li><strong>Event Marking:</strong> Use number keys 1-5 to mark traffic events while watching</li>
          </ul>
        </div>

        <div className="mb-4">
          <h5>Event Management</h5>
          <ul>
            <li><strong>Right-click events:</strong> Change event names by right-clicking on event buttons</li>
            <li><strong>Event counters:</strong> Numbers in parentheses show how many times each event was marked</li>
            <li><strong>Timeline info:</strong> "Total" shows time across all videos, "Current" shows time within active video</li>
          </ul>
        </div>

        <div className="mb-4">
          <h5>Keyboard Shortcuts</h5>
          
          <h6 className="mt-3 mb-2">General</h6>
          <Table striped bordered hover size="sm">
            <thead>
              <tr>
                <th>Key</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {shortcutCategories.general.map((shortcut, index) => (
                <tr key={index}>
                  <td><code>{shortcut.key}</code></td>
                  <td>{shortcut.description}</td>
                </tr>
              ))}
            </tbody>
          </Table>

          <h6 className="mt-3 mb-2">Video Playback</h6>
          <Table striped bordered hover size="sm">
            <thead>
              <tr>
                <th>Key</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {shortcutCategories.videoPlayback.map((shortcut, index) => (
                <tr key={index}>
                  <td><code>{shortcut.key}</code></td>
                  <td>{shortcut.description}</td>
                </tr>
              ))}
            </tbody>
          </Table>

          <h6 className="mt-3 mb-2">Annotation</h6>
          <Table striped bordered hover size="sm">
            <thead>
              <tr>
                <th>Key</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {shortcutCategories.annotation.map((shortcut, index) => (
                <tr key={index}>
                  <td><code>{shortcut.key}</code></td>
                  <td>{shortcut.description}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>

        <div className="mb-4">
          <h5>Interface Tips</h5>
          <ul>
            <li><strong>Layout:</strong> Drag the resize handle between video and timestamp sections to adjust layout</li>
            <li><strong>Video Upload:</strong> Use the folder icon in the header to hide/show the video upload section</li>
            <li><strong>Export Data:</strong> Click "CSV" to export all timestamps to a spreadsheet file</li>
            <li><strong>Dark Mode:</strong> Toggle with the sun/moon icon in the header</li>
          </ul>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={onHide}>
          Got it!
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default HelpModal;
