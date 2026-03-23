import React from 'react';
import './Header.css';

export default function Header({ title = 'Hello, User!', subtitle = "Here's your overview of your business!", userName = 'User Name', userEmail = 'user@example.com', userAvatar, hideProfile = false }) {
  return (
    <header className="app-header">
      <div className="header-left">
        <div className="header-title">{title}</div>
        <div className="header-subtitle">{subtitle}</div>
      </div>
      <div className="header-right">
        {!hideProfile && (
          <div className="header-user">
            <div className="user-info">
              <div className="user-name">{userName}</div>
              <div className="user-email">{userEmail}</div>
            </div>
            <div className="user-avatar">
              {userAvatar ? <img src={userAvatar} alt={userName} /> : <span>{(userName || 'U').slice(0, 1)}</span>}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
