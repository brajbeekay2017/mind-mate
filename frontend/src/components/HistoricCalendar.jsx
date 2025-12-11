import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';

const MOOD_EMOJIS = ["😄", "🙂", "😐", "😟", "😢"];
const MOOD_LABELS = ["Very Happy", "Happy", "Neutral", "Concerned", "Very Sad"];
const MOOD_COLORS = ["#4caf50", "#7cb342", "#fbc02d", "#ff9800", "#ef5350"]; 

export default function HistoricCalendar({ entries = [], userId }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDayData, setSelectedDayData] = useState(null);
  const [googleFitData, setGoogleFitData] = useState({});
  const [loading, setLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [activeTab, setActiveTab] = useState('daily'); // 'daily', 'trends', 'analysis'
  const [monthlyEntries, setMonthlyEntries] = useState([]);
  const [syncTimestamp, setSyncTimestamp] = useState(null);

  // Helper to format date keys as YYYY-MM-DD (local)
  const formatDateKey = (d) => {
    if (!d) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Fetch Google Fit data + mood entries for the current month
  useEffect(() => {
    const fetchAllForMonth = async () => {
      await Promise.all([fetchGoogleFitDataForMonth(), fetchMonthlyMoodEntries()]);
    };
    fetchAllForMonth();
    // read last google fit sync time from localStorage if available
    try {
      const raw = localStorage.getItem('googlefit_latest');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.timestamp) setSyncTimestamp(parsed.timestamp);
      }
    } catch (e) {}
  }, [currentMonth, userId]);

  // Listen for Google Fit connect/refresh events from `GoogleFitPanel` in the same window
  useEffect(() => {
    const onConnected = (e) => {
      // When Google Fit connection happens elsewhere, re-fetch monthly data
      try {
        fetchGoogleFitDataForMonth();
        fetchMonthlyMoodEntries();
        // update sync timestamp from localStorage
        try { const raw = localStorage.getItem('googlefit_latest'); if (raw) { const p = JSON.parse(raw); if (p?.timestamp) setSyncTimestamp(p.timestamp); } } catch(e) {}
      } catch (err) {
        console.error('Error re-fetching monthly data on connect:', err);
      }
    };

    window.addEventListener('googlefit_connected', onConnected);
    return () => window.removeEventListener('googlefit_connected', onConnected);
  }, []);

  const fetchGoogleFitDataForMonth = async () => {
    try {
      const token = localStorage.getItem('googlefit_token');
      if (!token) return;

      setLoading(true);
      const year = currentMonth.getFullYear();
      const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
      
      const res = await fetch(`${API_URL}/google-fit/monthly?accessToken=${token}&year=${year}&month=${month}`);
      if (res.ok) {
        const data = await res.json();
        // Normalize daily data so calendar has reliable numeric `steps`, `heartPoints`, and `sleepHours`.
        const rawDaily = data.dailyData || {};
        console.log('📊 [Calendar] Raw monthly Google Fit dailyData:', rawDaily);
        const normalized = {};
        Object.keys(rawDaily).forEach(k => {
          const src = rawDaily[k] || {};
          const steps = (typeof src.steps === 'number') ? src.steps : ((typeof src.totalSteps === 'number') ? src.totalSteps : Number(src.steps || 0));
          const hpCandidate = (typeof src.heartPoints !== 'undefined') ? src.heartPoints : (typeof src.heartMinutes !== 'undefined' ? src.heartMinutes : (typeof src.totalHeartMinutes !== 'undefined' ? src.totalHeartMinutes : undefined));
          const sleepMinutes = typeof src.sleepMinutes === 'number' ? src.sleepMinutes : Number(src.sleepMinutes || 0);
          const sleepHours = typeof src.sleepHours === 'number' ? src.sleepHours : (sleepMinutes ? Number((sleepMinutes / 60).toFixed(1)) : undefined);

          normalized[k] = Object.assign({}, src, { steps: Number(steps || 0) });
          if (typeof hpCandidate !== 'undefined') normalized[k].heartPoints = Number(hpCandidate || 0);
          if (sleepMinutes) normalized[k].sleepMinutes = sleepMinutes;
          if (typeof sleepHours !== 'undefined') normalized[k].sleepHours = sleepHours;
        });
        console.log('✅ [Calendar] Normalized Google Fit data:', normalized);
        setGoogleFitData(normalized);

        // update sync timestamp if available in localStorage
        try {
          const raw = localStorage.getItem('googlefit_latest');
          if (raw) {
            const p = JSON.parse(raw);
            if (p?.timestamp) setSyncTimestamp(p.timestamp);
          }
        } catch (e) {}
      }
    } catch (e) {
      console.error('Error fetching Google Fit data:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyMoodEntries = async () => {
    try {
      if (!userId) return;
      const year = currentMonth.getFullYear();
      const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
      const res = await fetch(`${API_URL}/mood/monthly?userId=${encodeURIComponent(userId)}&year=${year}&month=${month}`);
      if (res.ok) {
        const data = await res.json();
        // Expecting { entries: [...] }
        setMonthlyEntries(Array.isArray(data.entries) ? data.entries : []);
        // If a day is selected, refresh its entries from the new monthly dataset
        if (selectedDate) {
          setSelectedDayData(getEntriesByDate(selectedDate, data.entries || []));
        }
      }
    } catch (e) {
      console.error('Error fetching monthly mood entries:', e);
    }
  };

  // Generate AI insight
  const generateAiInsight = async () => {
    if (!selectedDate || !selectedDayData || selectedDayData.length === 0) return;
    
    try {
      setLoadingInsight(true);
      const dateStr = formatDateKey(selectedDate);
      const avgMood = getAverageMood(selectedDate);
      const avgStress = getAverageStress(selectedDate);
      
      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Based on this wellness data, provide a supportive insight:\nDate: ${dateStr}\nMood: ${avgMood}/4 (${MOOD_LABELS[avgMood]})\nStress: ${avgStress}/5\nEntries logged: ${selectedDayData.length}\nProvide a brief (2-3 sentences) wellness recommendation.`,
          userId: userId
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        setAiInsight(data.reply);
      }
    } catch (e) {
      console.error('Error generating AI insight:', e);
    } finally {
      setLoadingInsight(false);
    }
  };

  useEffect(() => {
    if (selectedDate && selectedDayData && selectedDayData.length > 0) {
      generateAiInsight();
    } else {
      setAiInsight(null);
    }
  }, [selectedDate]);

  // Use monthlyEntries if available, otherwise fall back to prop `entries`
  const entriesSource = (Array.isArray(monthlyEntries) && monthlyEntries.length > 0) ? monthlyEntries : entries;

  // Determine last available Google Fit date key (YYYY-MM-DD) from the returned monthly data
  const getLastAvailableGFKey = () => {
    try {
      const keys = Object.keys(googleFitData || {});
      if (!keys || keys.length === 0) return null;
      const sorted = keys.slice().sort();
      return sorted[sorted.length - 1];
    } catch (e) {
      return null;
    }
  };
  const lastAvailableGFKey = getLastAvailableGFKey();

  // Get mood entries by date (accept optional overrideEntries)
  const getEntriesByDate = (date, overrideEntries) => {
    const src = Array.isArray(overrideEntries) ? overrideEntries : entriesSource;
    if (!date || !Array.isArray(src)) return [];
    // Compare by local year/month/day to avoid timezone shifts when converting to ISO strings
    const targetY = date.getFullYear();
    const targetM = date.getMonth();
    const targetD = date.getDate();

    return src.filter(entry => {
      if (!entry || !entry.timestamp) return false;
      const ed = new Date(entry.timestamp);
      return ed.getFullYear() === targetY && ed.getMonth() === targetM && ed.getDate() === targetD;
    });
  };

  // Handle date selection
  const handleDateClick = (date) => {
    setSelectedDate(date);
    setSelectedDayData(getEntriesByDate(date));
    setActiveTab('daily');
  };

  // Get calendar days
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  // Navigation
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
    setSelectedDate(null);
    setSelectedDayData(null);
    setMonthlyEntries([]);
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
    setSelectedDate(null);
    setSelectedDayData(null);
    setMonthlyEntries([]);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    handleDateClick(today);
  };

  // Get average mood for a date
  const getAverageMood = (date) => {
    if (!date) return null;
    const dayEntries = getEntriesByDate(date);
    if (dayEntries.length === 0) return null;
    const moodValues = dayEntries.map(e => typeof e.mood === 'number' ? e.mood : 0);
    const avg = moodValues.reduce((sum, mood) => sum + mood, 0) / moodValues.length;
    return Math.round(avg);
  };

  // Get average stress for a date
  const getAverageStress = (date) => {
    if (!date) return null;
    const dayEntries = getEntriesByDate(date);
    if (dayEntries.length === 0) return null;
    const stressValues = dayEntries.map(e => typeof e.stress === 'number' ? e.stress : 0);
    const avg = stressValues.reduce((sum, stress) => sum + stress, 0) / stressValues.length;
    return Math.round(avg);
  };

  // Calculate monthly statistics
  const getMonthlyStats = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    let totalMood = 0, totalStress = 0, daysWithData = 0;
    const moodDistribution = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const mood = getAverageMood(date);
      const stress = getAverageStress(date);

      if (mood !== null) {
        totalMood += mood;
        daysWithData++;
        moodDistribution[mood]++;
      }
      if (stress !== null) {
        totalStress += stress;
      }
    }

    return {
      avgMood: daysWithData > 0 ? (totalMood / daysWithData).toFixed(2) : 0,
      avgStress: daysWithData > 0 ? (totalStress / daysWithData).toFixed(2) : 0,
      daysWithData,
      moodDistribution
    };
  };

  // Calculate trend for last 7 days
  const getLast7DaysTrend = () => {
    const trend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const mood = getAverageMood(date);
      const stress = getAverageStress(date);
      const dateKey = formatDateKey(date);
      const gfData = googleFitData[dateKey];
      trend.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        mood,
        stress,
        steps: gfData?.steps || 0,
        heartPoints: gfData?.heartPoints || 0
      });
    }
    return trend;
  };

  // Build calendar grid
  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const calendarDays = [];
  
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
  }

  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  
  let stats = { avgMood: 0, avgStress: 0, daysWithData: 0, moodDistribution: {} };
  let last7Days = [];
  
  try {
    stats = getMonthlyStats();
    last7Days = getLast7DaysTrend();
  } catch (e) {
    console.error('Error calculating stats:', e);
  }

  return (
    <div style={{ 
      padding: '20px', 
      display: 'flex', 
      gap: '20px', 
      height: '100%',
      minHeight: '600px',
      width: '100%',
      overflow: 'hidden' 
    }}>
      {/* Calendar Section */}
      <div style={{ flex: '1 1 50%', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        {/* Navigation */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <button
              onClick={prevMonth}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                background: '#f0f0f0',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '12px'
              }}
            >
              ← Previous
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>{monthName}</h3>
              {syncTimestamp && (
                <div style={{ fontSize: '11px', color: '#666', marginTop: 4 }} title={`Last sync: ${new Date(syncTimestamp).toLocaleString()}`}>
                  <span style={{ fontWeight: 600 }}>Last sync:</span>&nbsp;{new Date(syncTimestamp).toLocaleString()}
                </div>
              )}
            </div>
            <button
              onClick={nextMonth}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                background: '#f0f0f0',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '12px'
              }}
            >
              Next →
            </button>
          </div>

          <button
            onClick={goToToday}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #6FA8F1 0%, #4FD1C5 100%)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '12px',
              marginBottom: '16px',
            }}
          >
            📅 Today
          </button>

          {/* Monthly Stats */}
          <div style={{ background: '#f9f9f9', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <span style={{ color: '#666' }}>Avg Mood: </span>
                <span style={{ fontWeight: '600', fontSize: '14px' }}>{stats.avgMood}/4</span>
              </div>
              <div>
                <span style={{ color: '#666' }}>Avg Stress: </span>
                <span style={{ fontWeight: '600', fontSize: '14px' }}>{stats.avgStress}/5</span>
              </div>
              <div>
                <span style={{ color: '#666' }}>Days Logged: </span>
                <span style={{ fontWeight: '600', fontSize: '14px' }}>{stats.daysWithData}</span>
              </div>
              <div>
                <span style={{ color: '#666' }}>Total Entries: </span>
                <span style={{ fontWeight: '600', fontSize: '14px' }}>{entriesSource.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Day labels */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px' }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div
              key={day}
              style={{
                textAlign: 'center',
                fontWeight: '600',
                fontSize: '12px',
                padding: '8px',
                color: '#666',
              }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', flex: 1 }}>
          {calendarDays.map((date, idx) => {
            const moodIdx = date ? getAverageMood(date) : null;
            const stress = date ? getAverageStress(date) : null;
            const gfData = date ? googleFitData[formatDateKey(date)] : null;
            const isSelected = selectedDate && date && date.toDateString() === selectedDate.toDateString();
            const isToday = date && date.toDateString() === new Date().toDateString();

            return (
              <div
                key={idx}
                onClick={() => date && handleDateClick(date)}
                style={{
                  padding: '8px',
                  border: isSelected ? '3px solid #6FA8F1' : isToday ? '2px solid #ff9800' : '1px solid #ddd',
                  borderRadius: '8px',
                  background: isSelected ? '#f0f7ff' : isToday ? '#fff9e6' : '#f9f9f9',
                  cursor: date ? 'pointer' : 'default',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '100px',
                  transition: 'all 0.2s ease',
                  opacity: date ? 1 : 0.3,
                }}
                onMouseOver={(e) => {
                  if (date) e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {date && (
                  <>
                    {/* Day number */}
                    <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                      {date.getDate()}
                    </div>

                    {/* Mood emoji */}
                    {moodIdx !== null && (
                      <div
                        style={{
                          fontSize: '28px',
                          marginBottom: '2px',
                        }}
                        title={MOOD_LABELS[moodIdx]}
                      >
                        {MOOD_EMOJIS[moodIdx]}
                      </div>
                    )}

                    {/* Stress indicator */}
                    {stress !== null && (
                      <div style={{ fontSize: '10px', color: '#666', marginBottom: '2px' }}>
                        Stress: {stress}
                      </div>
                    )}

                    {/* Google Fit indicator - Steps & Heart Points (show for all dates up to today) */}
                    {gfData && date <= new Date() && (
                      <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '1px', alignItems: 'center' }}>
                        {/* Steps: always show if gfData exists */}
                        {typeof gfData.steps !== 'undefined' && (
                          <div style={{ fontSize: '11px', color: '#4FD1C5', fontWeight: '600' }} title={`Steps: ${gfData.steps}`}>
                            🚶 {gfData.steps}
                          </div>
                        )}
                        {/* Heart Points: accept alternative fields and show when present; faded when explicitly 0 */}
                        {(() => {
                          const hp = (gfData && (typeof gfData.heartPoints !== 'undefined' ? gfData.heartPoints : (typeof gfData.heartMinutes !== 'undefined' ? gfData.heartMinutes : (typeof gfData.totalHeartMinutes !== 'undefined' ? gfData.totalHeartMinutes : undefined))));
                          if (typeof hp === 'undefined') return null;
                          return (
                            <div
                              style={{
                                fontSize: '11px',
                                color: '#e74c3c',
                                fontWeight: '600',
                                opacity: (typeof hp === 'number' && hp === 0) ? 0.45 : 1
                              }}
                              title={`Heart Points: ${hp}. Heart Points (HP) measure vigorous activity (higher is better).`}
                            >
                              ❤️ {hp}
                            </div>
                          );
                        })()}
                        {/* Sleep: show if available (hours or minutes) */}
                        {(() => {
                          const sleepH = typeof gfData.sleepHours !== 'undefined' ? gfData.sleepHours : undefined;
                          const sleepM = typeof gfData.sleepMinutes === 'number' ? gfData.sleepMinutes : undefined;
                          const displayH = typeof sleepH !== 'undefined' ? sleepH : (sleepM ? Number((sleepM / 60).toFixed(1)) : undefined);
                          if (typeof displayH === 'undefined') return null;
                          return (
                            <div
                              style={{ fontSize: '11px', color: '#9b59b6', fontWeight: '600' }}
                              title={`Sleep: ${displayH} hours`}
                            >
                              😴 {displayH}h
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail & Analytics Panel */}
      <div
        style={{
          flex: '1 1 50%',
          background: '#f9f9f9',
          borderRadius: '12px',
          padding: '20px',
          borderLeft: '2px solid #6FA8F1',
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {selectedDate ? (
          <>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>
              {selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </h3>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '2px solid #e0e0e0' }}>
              {['daily', 'trends', 'analysis'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '8px 12px',
                    border: 'none',
                    background: activeTab === tab ? '#6FA8F1' : 'transparent',
                    color: activeTab === tab ? '#fff' : '#666',
                    cursor: 'pointer',
                    fontWeight: activeTab === tab ? '600' : '400',
                    fontSize: '12px',
                    borderRadius: activeTab === tab ? '4px 4px 0 0' : '0',
                  }}
                >
                  {tab === 'daily' && '📊 Daily'}
                  {tab === 'trends' && '📈 Trends'}
                  {tab === 'analysis' && '🤖 AI'}
                </button>
              ))}
            </div>

            {/* Daily Tab */}
            {activeTab === 'daily' && (
              <div style={{ flex: 1, overflow: 'auto' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#333' }}>
                  Mood Entries ({selectedDayData?.length || 0})
                </h4>
                {selectedDayData && selectedDayData.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                    {selectedDayData.map((entry, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '12px',
                          background: '#fff',
                          borderRadius: '8px',
                          border: `3px solid ${MOOD_COLORS[entry.mood]}`,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '24px' }}>{MOOD_EMOJIS[entry.mood]}</span>
                          <span style={{ fontSize: '12px', color: '#666', fontWeight: '600' }}>
                            {new Date(entry.timestamp).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                          <strong>Mood:</strong> {MOOD_LABELS[entry.mood]}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                          <strong>Stress:</strong> {entry.stress}/5
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '14px', color: '#999', marginBottom: '16px' }}>No mood entries for this day</div>
                )}

                {/* Google Fit Data */}
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#333' }}>
                  Health Metrics
                </h4>
                {googleFitData[formatDateKey(selectedDate)] ? (
                  <div
                    style={{
                      padding: '12px',
                      background: '#fff',
                      borderRadius: '8px',
                      border: '2px solid #4FD1C5',
                    }}
                  >
                    {/* Date Header */}
                    <div style={{ marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #eee', fontSize: '11px', fontWeight: '600', color: '#4FD1C5' }}>
                      📅 {selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </div>

                    {/* Primary Metrics - Steps and Heart Points */}
                    <div style={{ marginBottom: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: '#999', marginBottom: '4px' }}>Steps</div>
                        <div style={{ fontSize: '16px', fontWeight: '600', color: '#4FD1C5' }}>
                          {googleFitData[formatDateKey(selectedDate)]?.steps || 0}
                        </div>
                      </div>
                      
                      {/* Heart Points */}
                      <div>
                        <div style={{ fontSize: '11px', color: '#999', marginBottom: '4px' }}>Heart Points</div>
                        <div style={{ fontSize: '16px', fontWeight: '600', color: '#e74c3c' }}>
                          {(() => {
                            const gf = googleFitData[formatDateKey(selectedDate)];
                            const hp = (gf && (typeof gf.heartPoints !== 'undefined' ? gf.heartPoints : (typeof gf.heartMinutes !== 'undefined' ? gf.heartMinutes : (typeof gf.totalHeartMinutes !== 'undefined' ? gf.totalHeartMinutes : 0))));
                            return typeof hp === 'number' ? hp : 0;
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Heart Rate Metrics */}
                    {(() => {
                      const gf = googleFitData[formatDateKey(selectedDate)];
                      const hasRHR = typeof gf?.restingHeartRate === 'number';
                      const hasAvgHR = typeof gf?.avgHeartRate === 'number';
                      if (!hasRHR && !hasAvgHR) return null;
                      return (
                        <div style={{ marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #eee', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          {hasRHR && (
                            <div>
                              <div style={{ fontSize: '11px', color: '#999', marginBottom: '4px' }}>Resting HR</div>
                              <div style={{ fontSize: '16px', fontWeight: '600', color: '#3498db' }}>
                                {Math.round(gf.restingHeartRate)} bpm
                              </div>
                            </div>
                          )}
                          {hasAvgHR && (
                            <div>
                              <div style={{ fontSize: '11px', color: '#999', marginBottom: '4px' }}>Avg Heart Rate</div>
                              <div style={{ fontSize: '16px', fontWeight: '600', color: '#e67e22' }}>
                                {Math.round(gf.avgHeartRate)} bpm
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Sleep Data */}
                    {(() => {
                      const gf = googleFitData[formatDateKey(selectedDate)];
                      const sleepH = gf ? gf.sleepHours : undefined;
                      const sleepM = gf && typeof gf.sleepMinutes === 'number' ? gf.sleepMinutes : undefined;
                      const displayH = typeof sleepH !== 'undefined' ? sleepH : (sleepM ? Number((sleepM / 60).toFixed(1)) : undefined);
                      if (typeof displayH === 'undefined') return null;
                      return (
                        <div style={{ marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #eee' }}>
                          <div style={{ fontSize: '11px', color: '#999', marginBottom: '4px' }}>Sleep Duration</div>
                          <div style={{ fontSize: '16px', fontWeight: '600', color: '#9b59b6', marginBottom: '4px' }}>
                            {displayH} hours
                          </div>
                          <div style={{ fontSize: '11px', color: '#aaa' }}>
                            ({sleepM || Math.round((displayH * 60))} minutes)
                          </div>
                        </div>
                      );
                    })()}

                    {/* Other Available Data */}
                    {(() => {
                      const gf = googleFitData[formatDateKey(selectedDate)];
                      if (!gf) return null;
                      const otherKeys = Object.keys(gf).filter(
                        k => !['steps', 'heartPoints', 'heartMinutes', 'totalHeartMinutes', 'restingHeartRate', 'avgHeartRate', 'sleepHours', 'sleepMinutes', 'timestamp'].includes(k)
                      );
                      if (otherKeys.length === 0) return null;
                      return (
                        <div style={{ marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #eee' }}>
                          <div style={{ fontSize: '11px', color: '#999', marginBottom: '6px', fontWeight: '600' }}>Other Metrics:</div>
                          {otherKeys.map((key, idx) => {
                            const val = gf[key];
                            let displayVal = val;
                            if (typeof val === 'number') displayVal = Math.round(val * 100) / 100;
                            return (
                              <div key={idx} style={{ fontSize: '11px', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#666', textTransform: 'capitalize' }}>
                                  {key.replace(/([A-Z])/g, ' $1').trim()}:
                                </span>
                                <span style={{ fontWeight: '600', color: '#555' }}>{displayVal}</span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}

                    {/* Activity Summary */}
                    <div style={{ padding: '10px', background: '#f5f5f5', borderRadius: '6px', fontSize: '11px', color: '#666' }}>
                      <div style={{ marginBottom: '4px', fontWeight: '600', color: '#333' }}>Activity Summary:</div>
                      <div>
                        {(() => {
                          const gf = googleFitData[formatDateKey(selectedDate)];
                          const steps = gf?.steps || 0;
                          const hp = (() => {
                            const h = gf && (typeof gf.heartPoints !== 'undefined' ? gf.heartPoints : (typeof gf.heartMinutes !== 'undefined' ? gf.heartMinutes : (typeof gf.totalHeartMinutes !== 'undefined' ? gf.totalHeartMinutes : 0)));
                            return typeof h === 'number' ? h : 0;
                          })();
                          
                          if (steps > 8000) return '✅ Excellent activity level!';
                          if (steps > 5000) return '👍 Good activity level';
                          if (hp > 30) return '💪 Strong vigorous activity';
                          if (steps > 0) return '📊 Light activity logged';
                          return '⚠️ No activity data';
                        })()}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '14px', color: '#999' }}>
                    No Google Fit data for this day
                  </div>
                )}
              </div>
            )}

            {/* Trends Tab */}
            {activeTab === 'trends' && (
              <div style={{ flex: 1, overflow: 'auto' }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '600', color: '#333' }}>
                  Last 7 Days Trend
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {last7Days.map((day, idx) => (
                    <div key={idx} style={{ padding: '12px', background: '#fff', borderRadius: '8px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px', color: '#333' }}>
                        {day.date}
                      </div>
                      {day.mood !== null ? (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <span style={{ fontSize: '20px' }}>{MOOD_EMOJIS[day.mood]}</span>
                            <div style={{ flex: 1, height: '20px', background: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                              <div
                                style={{
                                  height: '100%',
                                  width: `${(day.mood / 4) * 100}%`,
                                  background: MOOD_COLORS[day.mood],
                                  transition: 'width 0.3s'
                                }}
                              />
                            </div>
                            <span style={{ fontSize: '11px', color: '#666', minWidth: '45px' }}>Mood</span>
                          </div>
                          {day.stress !== null && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                              <span style={{ fontSize: '16px' }}>😰</span>
                              <div style={{ flex: 1, height: '20px', background: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                                <div
                                  style={{
                                    height: '100%',
                                    width: `${(day.stress / 5) * 100}%`,
                                    background: '#ff9800',
                                    transition: 'width 0.3s'
                                  }}
                                />
                              </div>
                              <span style={{ fontSize: '11px', color: '#666', minWidth: '45px' }}>Stress</span>
                            </div>
                          )}
                          {day.steps > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                              <span style={{ fontSize: '16px' }}>🚶</span>
                              <div style={{ flex: 1, height: '20px', background: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                                <div
                                  style={{
                                    height: '100%',
                                    width: `${Math.min((day.steps / 10000) * 100, 100)}%`,
                                    background: '#4FD1C5',
                                    transition: 'width 0.3s'
                                  }}
                                />
                              </div>
                              <span style={{ fontSize: '11px', color: '#666', minWidth: '45px' }}>{day.steps}</span>
                            </div>
                          )}
                          {day.heartPoints > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '16px' }}>❤️</span>
                              <div style={{ flex: 1, height: '20px', background: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                                <div
                                  style={{
                                    height: '100%',
                                    width: `${Math.min((day.heartPoints / 30) * 100, 100)}%`,
                                    background: '#e74c3c',
                                    transition: 'width 0.3s'
                                  }}
                                />
                              </div>
                              <span style={{ fontSize: '11px', color: '#666', minWidth: '45px' }}>{day.heartPoints}</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div style={{ fontSize: '12px', color: '#999' }}>No data</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Analysis Tab */}
            {activeTab === 'analysis' && (
              <div style={{ flex: 1, overflow: 'auto' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#333' }}>
                  🤖 AI Wellness Insight
                </h4>
                {loadingInsight ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
                    🔄 Generating insight...
                  </div>
                ) : aiInsight ? (
                  <div
                    style={{
                      padding: '16px',
                      background: '#fff',
                      borderRadius: '8px',
                      border: '2px solid #6FA8F1',
                      fontSize: '13px',
                      lineHeight: '1.6',
                      color: '#333',
                      marginBottom: '16px',
                    }}
                  >
                    {aiInsight}
                  </div>
                ) : (
                  <div style={{ fontSize: '14px', color: '#999', marginBottom: '16px' }}>
                    No analysis available
                  </div>
                )}

                {/* Daily Summary */}
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#333' }}>
                  Daily Summary
                </h4>
                {selectedDayData && selectedDayData.length > 0 ? (
                  <div
                    style={{
                      padding: '12px',
                      background: '#fff',
                      borderRadius: '8px',
                      border: '2px solid #fbc02d',
                    }}
                  >
                    <div style={{ marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', color: '#666' }}>📝 Entries: </span>
                      <span style={{ fontSize: '14px', fontWeight: '600' }}>{selectedDayData.length}</span>
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', color: '#666' }}>😊 Avg Mood: </span>
                      <span style={{ fontSize: '14px', fontWeight: '600' }}>
                        {MOOD_EMOJIS[getAverageMood(selectedDate)]} {MOOD_LABELS[getAverageMood(selectedDate)]}
                      </span>
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', color: '#666' }}>😰 Avg Stress: </span>
                      <span style={{ fontSize: '14px', fontWeight: '600' }}>
                        {getAverageStress(selectedDate)}/5
                      </span>
                    </div>
                    {googleFitData[formatDateKey(selectedDate)]?.steps && (
                      <div style={{ marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', color: '#666' }}>🚶 Steps: </span>
                        <span style={{ fontSize: '14px', fontWeight: '600' }}>
                          {googleFitData[formatDateKey(selectedDate)]?.steps}
                        </span>
                      </div>
                    )}
                    {googleFitData[formatDateKey(selectedDate)]?.heartPoints && (
                      <div>
                        <span style={{ fontSize: '12px', color: '#666' }}>❤️ Heart Points: </span>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#e74c3c' }}>
                          {googleFitData[formatDateKey(selectedDate)]?.heartPoints}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: '14px', color: '#999' }}>
                    No data recorded for this day
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div style={{ fontSize: '14px', color: '#999', textAlign: 'center', paddingTop: '100px' }}>
            📅 Select a date to view details and AI insights
          </div>
        )}
      </div>
    </div>
  );
}

