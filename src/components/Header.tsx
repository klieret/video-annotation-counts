import React from 'react';
import { Navbar, Container, Button, Nav } from 'react-bootstrap';

export type TabType = 'video-selection' | 'annotation' | 'results' | 'analysis';

interface HeaderProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onShowSettings: () => void;
  onShowHelp: () => void;
  onSaveSession: () => void;
}

const Header: React.FC<HeaderProps> = ({ darkMode, onToggleDarkMode, activeTab, onTabChange, onShowSettings, onShowHelp, onSaveSession }) => {
  return (
    <Navbar bg={darkMode ? 'dark' : 'light'} variant={darkMode ? 'dark' : 'light'} className="border-bottom">
      <Container fluid>
        <Navbar.Brand>
          🚗 Traffic Counter
        </Navbar.Brand>
        
        <Nav className="mx-auto">
          <Nav.Link 
            active={activeTab === 'video-selection'} 
            onClick={() => onTabChange('video-selection')}
            className="px-4"
          >
            📹 Set<u>u</u>p
          </Nav.Link>
          <Nav.Link 
            active={activeTab === 'annotation'} 
            onClick={() => onTabChange('annotation')}
            className="px-4"
          >
            ✏️ <u>A</u>nnotation
          </Nav.Link>
          <Nav.Link 
            active={activeTab === 'results'} 
            onClick={() => onTabChange('results')}
            className="px-4"
          >
            📊 <u>R</u>esults
          </Nav.Link>
          <Nav.Link 
            active={activeTab === 'analysis'} 
            onClick={() => onTabChange('analysis')}
            className="px-4"
          >
            📈 Anal<u>y</u>sis
          </Nav.Link>
        </Nav>
        
        <div className="d-flex align-items-center gap-2">
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={onSaveSession}
            title="Save Session"
          >
            💾
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
