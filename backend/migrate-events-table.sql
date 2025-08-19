-- Calendar Events Table
CREATE TABLE IF NOT EXISTS calendar_events (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type ENUM('court_date', 'meeting', 'deadline', 'client_meeting', 'internal_meeting', 'other') NOT NULL,
    start_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_date DATE NOT NULL,
    end_time TIME NOT NULL,
    location VARCHAR(500),
    is_all_day BOOLEAN DEFAULT FALSE,
    priority ENUM('high', 'medium', 'low') NOT NULL DEFAULT 'medium',
    status ENUM('scheduled', 'confirmed', 'cancelled', 'completed') NOT NULL DEFAULT 'scheduled',
    created_by VARCHAR(36) NOT NULL,
    case_id VARCHAR(36),
    contract_id VARCHAR(36),
    reminder_sent BOOLEAN DEFAULT FALSE,
    reminder_sent_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE SET NULL,
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE SET NULL
);

-- Event Attendees Table (for both system users and external parties)
CREATE TABLE IF NOT EXISTS event_attendees (
    id VARCHAR(36) PRIMARY KEY,
    event_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36), -- NULL for external attendees
    external_name VARCHAR(255), -- For non-system users
    external_email VARCHAR(255), -- For non-system users
    role ENUM('organizer', 'attendee', 'optional') NOT NULL DEFAULT 'attendee',
    response_status ENUM('pending', 'accepted', 'declined', 'tentative') NOT NULL DEFAULT 'pending',
    reminder_sent BOOLEAN DEFAULT FALSE,
    reminder_sent_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES calendar_events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    -- Ensure either user_id or external_email is provided
    CONSTRAINT check_attendee_type CHECK (
        (user_id IS NOT NULL AND external_email IS NULL) OR 
        (user_id IS NULL AND external_email IS NOT NULL)
    )
);

-- Indexes for performance
CREATE INDEX idx_calendar_events_date ON calendar_events(start_date, end_date);
CREATE INDEX idx_calendar_events_created_by ON calendar_events(created_by);
CREATE INDEX idx_calendar_events_status ON calendar_events(status);
CREATE INDEX idx_event_attendees_event_id ON event_attendees(event_id);
CREATE INDEX idx_event_attendees_user_id ON event_attendees(user_id);
CREATE INDEX idx_event_attendees_external_email ON event_attendees(external_email);
