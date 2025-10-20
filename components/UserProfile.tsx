import React, { useState } from 'react';
import { authService } from '../services/authService';

export const UserProfile: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const user = authService.getCurrentUser();

  if (!user) {
    return (
      <button className="signin-button" onClick={async () => {
        try {
          await authService.signInWithGoogle();
        } catch (error) {
          await authService.signInWithMockUser('user@example.com', 'Test User');
        }
      }}>
        Sign In
        <style jsx>{`
          .signin-button {
            padding: 8px 16px;
            background: #4a9;
            border: none;
            border-radius: 6px;
            color: #fff;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s;
          }
          .signin-button:hover {
            background: #5ba;
          }
        `}</style>
      </button>
    );
  }

  return (
    <div className="user-profile">
      <button className="profile-button" onClick={() => setIsOpen(!isOpen)}>
        {user.picture ? (
          <img src={user.picture} alt={user.name} />
        ) : (
          <div className="avatar-placeholder">{user.name[0]}</div>
        )}
      </button>

      {isOpen && (
        <div className="profile-dropdown">
          <div className="profile-info">
            {user.picture && <img src={user.picture} alt={user.name} className="profile-pic" />}
            <div className="profile-details">
              <div className="profile-name">{user.name}</div>
              <div className="profile-email">{user.email}</div>
            </div>
          </div>

          <div className="profile-divider" />

          <button className="profile-menu-item" onClick={() => {
            // Open settings
            setIsOpen(false);
          }}>
            ⚙️ Settings
          </button>

          <button className="profile-menu-item" onClick={async () => {
            await authService.signOut();
            setIsOpen(false);
          }}>
            🚪 Sign Out
          </button>
        </div>
      )}

      <style jsx>{`
        .user-profile {
          position: relative;
        }

        .profile-button {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: none;
          padding: 0;
          cursor: pointer;
          overflow: hidden;
          background: #2a2a2a;
          transition: all 0.2s;
        }

        .profile-button:hover {
          transform: scale(1.1);
        }

        .profile-button img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatar-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #4a9;
          color: #fff;
          font-weight: bold;
          font-size: 16px;
        }

        .profile-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 8px;
          background: #1a1a1a;
          border: 1px solid #444;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          min-width: 250px;
          z-index: 1000;
        }

        .profile-info {
          padding: 16px;
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .profile-pic {
          width: 48px;
          height: 48px;
          border-radius: 50%;
        }

        .profile-details {
          flex: 1;
        }

        .profile-name {
          color: #fff;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .profile-email {
          color: #888;
          font-size: 13px;
        }

        .profile-divider {
          height: 1px;
          background: #333;
          margin: 8px 0;
        }

        .profile-menu-item {
          width: 100%;
          padding: 12px 16px;
          background: none;
          border: none;
          color: #fff;
          text-align: left;
          cursor: pointer;
          transition: background 0.2s;
          font-size: 14px;
        }

        .profile-menu-item:hover {
          background: #2a2a2a;
        }

        .profile-menu-item:first-of-type {
          border-radius: 0;
        }

        .profile-menu-item:last-of-type {
          border-radius: 0 0 8px 8px;
        }
      `}</style>
    </div>
  );
};

