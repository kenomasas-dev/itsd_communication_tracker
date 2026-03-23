import React, { useState, useEffect } from 'react';
import './Calendar.css';
import UserSidebar from './sidebar';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon, ReloadIcon } from '@radix-ui/react-icons';

export default function Calendar() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [communications, setCommunications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDateData, setSelectedDateData] = useState([]);

  // Fetch communications data
  useEffect(() => {
    const fetchCommunications = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/communications');
        if (!res.ok) throw new Error(`Server responded ${res.status}`);
        const data = await res.json();
        setCommunications(data || []);
      } catch (err) {
        console.error('Failed to load communications:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCommunications();
  }, []);

  // Get days with submissions
  const getDaysWithSubmissions = () => {
    const daysMap = {};
    communications.forEach(item => {
      if (item.communication_date) {
        const date = new Date(item.communication_date);
        const day = date.toISOString().split('T')[0]; // YYYY-MM-DD
        daysMap[day] = (daysMap[day] || 0) + 1;
      }
    });
    return daysMap;
  };

  // Get submissions for selected date
  const getSubmissionsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return communications.filter(item => {
      if (item.communication_date) {
        return item.communication_date.split('T')[0] === dateStr;
      }
      return false;
    });
  };

  const handleDateClick = (day) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(date);
    setSelectedDateData(getSubmissionsForDate(date));
  };

  const goOverview = () => navigate('/User');
  const goBackMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  const goNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  const goToday = () => setCurrentDate(new Date());

  // Calendar generation
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();
  
  const daysWithSubmissions = getDaysWithSubmissions();
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Create calendar grid
  const calendarDays = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  // Get the formatted date for checking
  const getDateKey = (day) => {
    const date = new Date(year, month, day);
    return date.toISOString().split('T')[0];
  };

  const isToday = (day) => {
    const today = new Date();
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  };

  const isSelected = (day) => {
    return selectedDate && day === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear();
  };

  return (
    <div className="user-page calendar-page">
      <UserSidebar active={'calendar'} />
      <main className="user-main">
        <div className="page-header">
          <div>
            <h1>Calendar</h1>
            <p className="subtitle">View submissions by date</p>
          </div>
          <div style={{ marginLeft: 12, display: 'flex', gap: '8px' }}>
            <button className="btn-secondary" onClick={goToday}>Today</button>
            <button className="btn-secondary" onClick={goOverview}><ArrowLeftIcon style={{width:'16px', height:'16px', verticalAlign:'middle', marginRight:'4px'}} />Back to Overview</button>
          </div>
        </div>

        {loading && <div style={{padding:'32px',textAlign:'center',color:'#666'}}>Loading...</div>}

        {!loading && (
          <div className="calendar-container">
            {/* Calendar Section */}
            <div className="calendar-section">
              {/* Month Navigation */}
              <div className="calendar-header">
                <button className="month-nav-btn" onClick={goBackMonth}><ChevronLeftIcon /></button>
                <h2 className="month-title">{monthName}</h2>
                <button className="month-nav-btn" onClick={goNextMonth}><ChevronRightIcon /></button>
              </div>

              {/* Day Headers */}
              <div className="calendar-weekdays">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="weekday-header">{day}</div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="calendar-grid">
                {calendarDays.map((day, index) => {
                  const hasSubmissions = day && daysWithSubmissions[getDateKey(day)];
                  const submissionCount = hasSubmissions || 0;
                  const isCurrentDay = isToday(day);
                  const isCurrentSelected = isSelected(day);

                  return (
                    <div
                      key={index}
                      className={`calendar-day ${day ? 'active' : 'empty'} ${isCurrentDay ? 'today' : ''} ${isCurrentSelected ? 'selected' : ''} ${hasSubmissions ? 'has-submissions' : ''}`}
                      onClick={() => day && handleDateClick(day)}
                    >
                      {day && (
                        <>
                          <div className="day-number">{day}</div>
                          {hasSubmissions && (
                            <div className="submission-badge">{submissionCount}</div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="calendar-legend">
                <div className="legend-item">
                  <div className="legend-color today-color"></div>
                  <span>Today</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color has-submissions-color"></div>
                  <span>Has Submissions</span>
                </div>
              </div>
            </div>

            {/* Submissions Detail Section */}
            <div className="submissions-section">
              {selectedDate ? (
                <>
                  <div className="submissions-header">
                    <h3>{selectedDate.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h3>
                    <span className="submission-count">{selectedDateData.length} submission{selectedDateData.length !== 1 ? 's' : ''}</span>
                  </div>

                  {selectedDateData.length > 0 ? (
                    <div className="submissions-list">
                      {selectedDateData.map((item, index) => (
                        <div key={index} className="submission-item">
                          <div className="submission-top">
                            <div className="submission-subject">{item.subject || 'No Subject'}</div>
                            <span className={`submission-status status-${item.status}`}>{item.status?.toUpperCase() || 'UNKNOWN'}</span>
                          </div>
                          <div className="submission-details">
                            <div className="detail-row">
                              <span className="detail-label">Direction:</span>
                              <span className="detail-value">{item.direction || '-'}</span>
                            </div>
                            <div className="detail-row">
                              <span className="detail-label">Organization:</span>
                              <span className="detail-value">{item.organization || '-'}</span>
                            </div>
                            <div className="detail-row">
                              <span className="detail-label">Priority:</span>
                              <span className={`priority-badge priority-${item.priority_level}`}>{item.priority_level?.toUpperCase() || 'NORMAL'}</span>
                            </div>
                            <div className="detail-row">
                              <span className="detail-label">Assigned To:</span>
                              <span className="detail-value">{item.assigned_to || '-'}</span>
                            </div>
                            {item.details && (
                              <div className="detail-row full-width">
                                <span className="detail-label">Details:</span>
                                <div className="detail-text">{item.details}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="no-submissions">
                      <div style={{fontSize: '40px', marginBottom: '12px'}}>📭</div>
                      <p>No submissions on this date</p>
                      <p style={{fontSize: '12px', color: '#999', marginTop: '8px'}}>Click on a date with a number badge to view submissions</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="no-selection">
                  <div style={{fontSize: '60px', marginBottom: '16px'}}>📅</div>
                  <p>Select a date to view submissions</p>
                  <p style={{fontSize: '12px', color: '#999', marginTop: '8px'}}>Click on any date in the calendar to see submissions for that day</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
