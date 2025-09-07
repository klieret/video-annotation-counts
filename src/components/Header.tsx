import React from 'react';
import { Navbar, Container, Button } from 'react-bootstrap';

interface HeaderProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  showVideoUpload: boolean;
  onToggleVideoUpload: () => void;
  onShowSettings: () => void;
  onShowHelp: () => void;
}

const Header: React.FC<HeaderProps> = ({ darkMode, onToggleDarkMode, showVideoUpload, onToggleVideoUpload, onShowSettings, onShowHelp }) => {
  return (
    <Navbar bg={darkMode ? 'dark' : 'light'} variant={darkMode ? 'dark' : 'light'} className="border-bottom">
      <Container fluid>
        <Navbar.Brand>
          🚶 Pedestrian Counter
        </Navbar.Brand>
        <div className="d-flex align-items-center gap-2">
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={onToggleVideoUpload}
            title="Toggle video upload section"
          >
            {showVideoUpload ? '📁' : '📂'}
          </Button>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={onShowSettings}
            title="Settings"
          >
            ⚙️
          </Button>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={onShowHelp}
            title="Help"
          >
            ❓
          </Button>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={onToggleDarkMode}
            title="Toggle dark mode"
          >
            {darkMode ? '☀️' : '🌙'}
          </Button>
        </div>
      </Container>
    </Navbar>
  );
};

export default Header;
