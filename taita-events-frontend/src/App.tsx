import { useEffect, useState, type FormEvent } from 'react'
import './App.css'

type Page =
  | 'dashboard'
  | 'events'
  | 'create-event'
  | 'meetings'
  | 'create-meeting'
  | 'attendance'
  | 'notifications'
  | 'reports'

type Event = {
  id?: number
  name: string
  date: string
  time: string
  venue: string
  description?: string
}

type Meeting = {
  id?: number
  title: string
  date: string
  time: string
  venue: string
  description?: string
}

type Attendance = {
  id?: number
  meeting_id: number
  attendee_name: string
  status: 'present' | 'absent'
  meeting?: Meeting
}

type User = {
  id: number
  name: string
  email: string
  role: 'admin' | 'user'
}

const API_URL = 'http://127.0.0.1:8000/api'

function App() {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('county_user')

    if (!savedUser) {
      return null
    }

    try {
      return JSON.parse(savedUser)
    } catch {
      return null
    }
  })

  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('county_token'),
  )

  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
  })

  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')

  const [page, setPage] = useState<Page>('dashboard')
  const [menuOpen, setMenuOpen] = useState(false)

  const [events, setEvents] = useState<Event[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [attendance, setAttendance] = useState<Attendance[]>([])

  const [loading, setLoading] = useState(false)

  const [eventForm, setEventForm] = useState({
    name: '',
    date: '',
    time: '',
    venue: '',
    description: '',
  })

  const [meetingForm, setMeetingForm] = useState({
    title: '',
    date: '',
    time: '',
    venue: '',
    description: '',
  })

  const [attendanceForm, setAttendanceForm] = useState({
    meeting_id: '',
    attendee_name: '',
    status: 'present',
  })

  const isAdmin = user?.role === 'admin'

  // ==========================================
  // AUTHENTICATION
  // ==========================================

  const login = async (e: FormEvent) =>{
    e.preventDefault()

    setLoginLoading(true)
    setLoginError('')
    

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(loginForm),
      })

      const data = await response.json()

      if (!response.ok) {
        setLoginError(data.message || 'Invalid email or password.')
        return
      }

      localStorage.setItem('county_token', data.token)
      localStorage.setItem('county_user', JSON.stringify(data.user))

      setToken(data.token)
      setUser(data.user)

      setLoginForm({
        email: '',
        password: '',
      })
    } catch (error) {
      console.error(error)
      setLoginError(
        'Unable to connect to the server. Please try again.',
      )
    } finally {
      setLoginLoading(false)
    }
  }

  const continueAsUser = async () => {
    setLoginLoading(true)
    setLoginError('')

    try {
      const response = await fetch(`${API_URL}/guest-login`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        setLoginError(data.message || 'Unable to continue as user.')
        return
      }

      localStorage.setItem('county_token', data.token)
      localStorage.setItem('county_user', JSON.stringify(data.user))

      setToken(data.token)
      setUser(data.user)

      setLoginForm({
        email: '',
        password: '',
      })
    } catch (error) {
      console.error(error)
      setLoginError(
        'Unable to connect to the server. Please try again.',
      )
    } finally {
      setLoginLoading(false)
    }
  }

  const logout = async () => {
    try {
      if (token) {
        await fetch(`${API_URL}/logout`, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        })
      }
    } catch (error) {
      console.error(error)
    }

    localStorage.removeItem('county_token')
    localStorage.removeItem('county_user')

    setToken(null)
    setUser(null)

    setEvents([])
    setMeetings([])
    setAttendance([])

    setPage('dashboard')
  }

  // ==========================================
  // AUTHENTICATED API HEADERS
  // ==========================================

  const authHeaders = () => {
    return {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    }
  }

  // ==========================================
  // LOAD DATA
  // ==========================================

  useEffect(() => {
    if (token) {
      loadData()
    }
  }, [token])

  const loadData = async () => {
    if (!token) return

    setLoading(true)

    try {
      const headers = authHeaders()

      const [eventsResponse, meetingsResponse, attendanceResponse] =
        await Promise.all([
          fetch(`${API_URL}/events`, {
            headers,
          }),
          fetch(`${API_URL}/meetings`, {
            headers,
          }),
          fetch(`${API_URL}/attendances`, {
            headers,
          }),
        ])

      if (
        eventsResponse.status === 401 ||
        meetingsResponse.status === 401 ||
        attendanceResponse.status === 401
      ) {
        await logout()
        return
      }

      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json()

        setEvents(
          Array.isArray(eventsData)
            ? eventsData
            : eventsData.events ?? [],
        )
      }

      if (meetingsResponse.ok) {
        const meetingsData = await meetingsResponse.json()

        setMeetings(
          Array.isArray(meetingsData)
            ? meetingsData
            : meetingsData.meetings ?? [],
        )
      }

      if (attendanceResponse.ok) {
        const attendanceData = await attendanceResponse.json()

        setAttendance(
          Array.isArray(attendanceData)
            ? attendanceData
            : attendanceData.attendances ?? [],
        )
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  // ==========================================
  // NAVIGATION
  // ==========================================

  const navigate = (destination: Page) => {
    setPage(destination)
    setMenuOpen(false)
  }

  // ==========================================
  // EVENTS
  // ==========================================

  const createEvent = async (e: FormEvent) => {
    e.preventDefault()

    if (!isAdmin) {
      alert('Only an administrator can create events.')
      return
    }

    try {
      const response = await fetch(`${API_URL}/events`, {
        method: 'POST',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventForm),
      })

      if (response.status === 403) {
        alert('Only the administrator can create events.')
        return
      }

      if (response.status === 401) {
        await logout()
        return
      }

      if (!response.ok) {
        alert('Could not create event.')
        return
      }

      const data = await response.json()

      setEvents((current) => [...current, data.event ?? data])

      setEventForm({
        name: '',
        date: '',
        time: '',
        venue: '',
        description: '',
      })

      alert('Event created successfully!')
      navigate('events')
    } catch (error) {
      console.error(error)
      alert('Error creating event.')
    }
  }

  const editEvent = async (event: Event) => {
    if (!isAdmin || !event.id) return

    const name = window.prompt('Event name:', event.name)

    if (name === null) return

    const date = window.prompt('Date:', event.date)

    if (date === null) return

    const time = window.prompt('Time:', event.time)

    if (time === null) return

    const venue = window.prompt('Venue:', event.venue)

    if (venue === null) return

    try {
      const response = await fetch(`${API_URL}/events/${event.id}`, {
        method: 'PUT',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          date,
          time,
          venue,
          description: event.description ?? '',
        }),
      })

      if (response.status === 403) {
        alert('Only the administrator can edit events.')
        return
      }

      if (!response.ok) {
        alert('Could not update event.')
        return
      }

      const data = await response.json()

      const updatedEvent = data.event ?? data

      setEvents((current) =>
        current.map((item) =>
          item.id === event.id ? updatedEvent : item,
        ),
      )

      alert('Event updated successfully!')
    } catch (error) {
      console.error(error)
      alert('Error updating event.')
    }
  }

  const deleteEvent = async (id?: number) => {
    if (!isAdmin || !id) return

    if (!window.confirm('Are you sure you want to delete this event?')) {
      return
    }

    try {
      const response = await fetch(`${API_URL}/events/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })

      if (response.status === 403) {
        alert('Only the administrator can delete events.')
        return
      }

      if (response.ok) {
        setEvents((current) =>
          current.filter((event) => event.id !== id),
        )
      } else {
        alert('Could not delete event.')
      }
    } catch (error) {
      console.error(error)
      alert('Error deleting event.')
    }
  }

  // ==========================================
  // MEETINGS
  // ==========================================

  const createMeeting = async (e: FormEvent) => {
    e.preventDefault()

    if (!isAdmin) {
      alert('Only an administrator can create meetings.')
      return
    }

    try {
      const response = await fetch(`${API_URL}/meetings`, {
        method: 'POST',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(meetingForm),
      })

      if (response.status === 403) {
        alert('Only the administrator can create meetings.')
        return
      }

      if (!response.ok) {
        alert('Could not create meeting.')
        return
      }

      const data = await response.json()

const newMeeting = data.meeting ?? data.data ?? data

setMeetings((current) => [
  ...current,
  newMeeting,
])

      setMeetingForm({
        title: '',
        date: '',
        time: '',
        venue: '',
        description: '',
      })

      alert('Meeting created successfully!')
      navigate('meetings')
    } catch (error) {
      console.error(error)
      alert('Error creating meeting.')
    }
  }

  const editMeeting = async (meeting: Meeting) => {
    if (!isAdmin || !meeting.id) return

    const title = window.prompt(
      'Meeting title:',
      meeting.title,
    )

    if (title === null) return

    const date = window.prompt('Date:', meeting.date)

    if (date === null) return

    const time = window.prompt('Time:', meeting.time)

    if (time === null) return

    const venue = window.prompt('Venue:', meeting.venue)

    if (venue === null) return

    try {
      const response = await fetch(
        `${API_URL}/meetings/${meeting.id}`,
        {
          method: 'PUT',
          headers: {
            ...authHeaders(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title,
            date,
            time,
            venue,
            description: meeting.description ?? '',
          }),
        },
      )

      if (response.status === 403) {
        alert('Only the administrator can edit meetings.')
        return
      }

      if (!response.ok) {
        alert('Could not update meeting.')
        return
      }

      const data = await response.json()

      const updatedMeeting = data.meeting ?? data

      setMeetings((current) =>
        current.map((item) =>
          item.id === meeting.id ? updatedMeeting : item,
        ),
      )

      alert('Meeting updated successfully!')
    } catch (error) {
      console.error(error)
      alert('Error updating meeting.')
    }
  }

  const deleteMeeting = async (id?: number) => {
    if (!isAdmin || !id) return

    if (!window.confirm('Delete this meeting?')) {
      return
    }

    try {
      const response = await fetch(
        `${API_URL}/meetings/${id}`,
        {
          method: 'DELETE',
          headers: authHeaders(),
        },
      )

      if (response.status === 403) {
        alert('Only the administrator can delete meetings.')
        return
      }

      if (response.ok) {
        setMeetings((current) =>
          current.filter((meeting) => meeting.id !== id),
        )
      } else {
        alert('Could not delete meeting.')
      }
    } catch (error) {
      console.error(error)
      alert('Error deleting meeting.')
    }
  }

  // ==========================================
  // ATTENDANCE
  // ==========================================

  const recordAttendance = async (e: FormEvent) => {
    e.preventDefault()

    if (!isAdmin) {
      alert('Only an administrator can record attendance.')
      return
    }

    if (
      !attendanceForm.meeting_id ||
      !attendanceForm.attendee_name
    ) {
      alert('Please fill in all required fields.')
      return
    }

    try {
      const response = await fetch(`${API_URL}/attendances`, {
        method: 'POST',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meeting_id: Number(attendanceForm.meeting_id),
          attendee_name: attendanceForm.attendee_name,
          status: attendanceForm.status,
        }),
      })

      if (response.status === 403) {
        alert('Only the administrator can record attendance.')
        return
      }

      if (!response.ok) {
        alert('Could not record attendance.')
        return
      }

      const data = await response.json()

      setAttendance((current) => [
        ...current,
        data.attendance ?? data,
      ])

      setAttendanceForm({
        meeting_id: '',
        attendee_name: '',
        status: 'present',
      })

      alert('Attendance recorded successfully!')
    } catch (error) {
      console.error(error)
      alert('Error recording attendance.')
    }
  }

  const editAttendance = async (record: Attendance) => {
    if (!isAdmin || !record.id) return

    const attendeeName = window.prompt(
      'Attendee name:',
      record.attendee_name,
    )

    if (attendeeName === null) return

    const status = window.prompt(
      'Status (present or absent):',
      record.status,
    )

    if (
      status !== 'present' &&
      status !== 'absent'
    ) {
      alert('Status must be present or absent.')
      return
    }

    try {
      const response = await fetch(
        `${API_URL}/attendances/${record.id}`,
        {
          method: 'PUT',
          headers: {
            ...authHeaders(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            meeting_id: record.meeting_id,
            attendee_name: attendeeName,
            status,
          }),
        },
      )

      if (response.status === 403) {
        alert('Only the administrator can edit attendance.')
        return
      }

      if (!response.ok) {
        alert('Could not update attendance.')
        return
      }

      const data = await response.json()

      const updatedAttendance = data.attendance ?? data

      setAttendance((current) =>
        current.map((item) =>
          item.id === record.id
            ? updatedAttendance
            : item,
        ),
      )

      alert('Attendance updated successfully!')
    } catch (error) {
      console.error(error)
      alert('Error updating attendance.')
    }
  }

  const deleteAttendance = async (id?: number) => {
    if (!isAdmin || !id) return

    if (!window.confirm('Delete this attendance record?')) {
      return
    }

    try {
      const response = await fetch(
        `${API_URL}/attendances/${id}`,
        {
          method: 'DELETE',
          headers: authHeaders(),
        },
      )

      if (response.status === 403) {
        alert('Only the administrator can delete attendance.')
        return
      }

      if (response.ok) {
        setAttendance((current) =>
          current.filter((record) => record.id !== id),
        )
      } else {
        alert('Could not delete attendance.')
      }
    } catch (error) {
      console.error(error)
      alert('Error deleting attendance.')
    }
  }

  // ==========================================
  // STATISTICS
  // ==========================================

  const presentCount = attendance.filter(
    (record) => record.status === 'present',
  ).length

  const absentCount = attendance.filter(
    (record) => record.status === 'absent',
  ).length

  const closeMenuOnOverlay = () => {
    if (menuOpen) {
      setMenuOpen(false)
    }
  }

  // ==========================================
  // LOGIN SCREEN
  // ==========================================

  if (!user) {
    return (
      <div className="app">
        <main className="main-content login-page">
          <section className="login-card">
            <div className="login-logo">TT</div>

            <span className="eyebrow">
              COUNTY MANAGEMENT PORTAL
            </span>

            <h1>Taita Taveta County</h1>

            <p className="login-subtitle">
              Events & Meetings Management System
            </p>

            <form onSubmit={login}>
              <div className="form-group">
                <label>Email</label>

                <input
                  type="email"
                  value={loginForm.email}
                  onChange={(e) =>
                    setLoginForm({
                      ...loginForm,
                      email: e.target.value,
                    })
                  }
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div className="form-group">
                <label>Password</label>

                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) =>
                    setLoginForm({
                      ...loginForm,
                      password: e.target.value,
                    })
                  }
                  placeholder="Enter your password"
                  required
                />
              </div>

              {loginError && (
                <div className="login-error">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                className="primary-button full-button"
                disabled={loginLoading}
              >
                {loginLoading
                  ? 'Signing in...'
                  : 'Sign In'}
              </button>
            </form>

            <p style={{ textAlign: 'center', margin: '18px 0' }}>
              or
            </p>

            <button
              type="button"
              className="secondary-button full-button"
              onClick={continueAsUser}
              disabled={loginLoading}
            >
              {loginLoading
                ? 'Please wait...'
                : 'Continue as User'}
            </button>

            <div className="login-info">
              <strong>Access Control</strong>

              <p>
                Administrators can manage system information.
                Other users have view-only access.
              </p>
            </div>
          </section>
        </main>
      </div>
    )
  }

  // ==========================================
  // MAIN APPLICATION
  // ==========================================

  return (
    <div className="app">

      {/* HEADER */}

      <header className="topbar">
        <div className="topbar-left">

          <button
            className="menu-button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Open navigation menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          <div className="brand">
            <div className="brand-logo">
              TT
            </div>

            <div>
              <h1>Taita Taveta County</h1>

              <span>
                Events & Meetings Management System
              </span>
            </div>
          </div>

        </div>

        <div className="topbar-right">

          <div className="online-dot"></div>

          <span>
            {isAdmin ? 'Administrator' : 'View Only User'}
          </span>

          <button
            className="secondary-button"
            onClick={logout}
          >
            Logout
          </button>

        </div>
      </header>

      {/* SIDEBAR */}

      <aside
        className={`sidebar ${
          menuOpen ? 'sidebar-open' : ''
        }`}
      >

        <div className="sidebar-header">

          <h2>Navigation</h2>

          <button
            className="close-menu"
            onClick={() => setMenuOpen(false)}
          >
            ×
          </button>

        </div>

        <div className="sidebar-menu">

          <button
            className={
              page === 'dashboard'
                ? 'active'
                : ''
            }
            onClick={() => navigate('dashboard')}
          >
            <span>⌂</span>
            Dashboard
          </button>

          <button
            className={
              page === 'events' ||
              page === 'create-event'
                ? 'active'
                : ''
            }
            onClick={() => navigate('events')}
          >
            <span>▣</span>
            Events
          </button>

          <button
            className={
              page === 'meetings' ||
              page === 'create-meeting'
                ? 'active'
                : ''
            }
            onClick={() => navigate('meetings')}
          >
            <span>▤</span>
            Meetings
          </button>

          <button
            className={
              page === 'attendance'
                ? 'active'
                : ''
            }
            onClick={() => navigate('attendance')}
          >
            <span>✓</span>
            Attendance
          </button>

          <button
            className={
              page === 'notifications'
                ? 'active'
                : ''
            }
            onClick={() =>
              navigate('notifications')
            }
          >
            <span>🔔</span>
            Notifications
          </button>

          <button
            className={
              page === 'reports'
                ? 'active'
                : ''
            }
            onClick={() => navigate('reports')}
          >
            <span>▥</span>
            Reports
          </button>

        </div>

        <div className="sidebar-footer">

          <div className="county-badge">
            TT
          </div>

          <div>
            <strong>{user.name}</strong>

            <small>
              {isAdmin
                ? 'Administrator'
                : 'View Only User'}
            </small>
          </div>

        </div>

      </aside>

      {menuOpen && (
        <div
          className="sidebar-overlay"
          onClick={closeMenuOnOverlay}
        ></div>
      )}

      {/* MAIN */}

      <main className="main-content">

        {/* DASHBOARD */}

        {page === 'dashboard' && (
          <>
            <section className="welcome-section">

              <div>
                <span className="eyebrow">
                  COUNTY MANAGEMENT PORTAL
                </span>

                <h2>
                  Welcome, {user.name}
                </h2>

                <p>
         {isAdmin
  ? 'Manage county events, meetings, attendance and notifications from one central system.'
  : 'View county events, meetings, attendance and notifications from one central system.'}
                </p>

                <div className="role-display">
                  <strong>
                    Access level:
                  </strong>{' '}
                  {isAdmin
                    ? 'Administrator'
                    : 'View Only'}
                </div>
              </div>

              <div className="welcome-decoration">
                <div className="big-tt">
                  TT
                </div>
              </div>

            </section>

            <section className="stats-grid">

              <div className="stat-card green-card">
                <div className="stat-icon">
                  ▣
                </div>

                <div>
                  <span>Total Events</span>
                  <strong>
                    {events.length}
                  </strong>
                </div>
              </div>

              <div className="stat-card orange-card">
                <div className="stat-icon">
                  ▤
                </div>

                <div>
                  <span>Total Meetings</span>
                  <strong>
                    {meetings.length}
                  </strong>
                </div>
              </div>

              <div className="stat-card blue-card">
                <div className="stat-icon">
                  ✓
                </div>

                <div>
                  <span>Attendance Records</span>
                  <strong>
                    {attendance.length}
                  </strong>
                </div>
              </div>

              <div className="stat-card dark-card">
                <div className="stat-icon">
                  ●
                </div>

                <div>
                  <span>Present</span>
                  <strong>
                    {presentCount}
                  </strong>
                </div>
              </div>

            </section>

            <section className="dashboard-grid">

              <div className="panel quick-panel">

                <div className="panel-heading">
                  <div>
                    <span className="section-label">
                      QUICK ACTIONS
                    </span>

                    <h3>
                      What would you like to do?
                    </h3>
                  </div>
                </div>

                <div className="quick-actions">

                  {isAdmin && (
                    <>
                      <button
                        className="quick-action"
                        onClick={() =>
                          navigate('create-event')
                        }
                      >
                        <div className="quick-icon green-icon">
                          +
                        </div>

                        <div>
                          <strong>
                            Create Event
                          </strong>

                          <span>
                            Add a new county event
                          </span>
                        </div>

                        <b>→</b>
                      </button>

                      <button
                        className="quick-action"
                        onClick={() =>
                          navigate('create-meeting')
                        }
                      >
                        <div className="quick-icon orange-icon">
                          +
                        </div>

                        <div>
                          <strong>
                            Create Meeting
                          </strong>

                          <span>
                            Schedule a meeting
                          </span>
                        </div>

                        <b>→</b>
                      </button>

                      <button
                        className="quick-action"
                        onClick={() =>
                          navigate('attendance')
                        }
                      >
                        <div className="quick-icon blue-icon">
                          ✓
                        </div>

                        <div>
                          <strong>
                            Record Attendance
                          </strong>

                          <span>
                            Register meeting attendance
                          </span>
                        </div>

                        <b>→</b>
                      </button>
                    </>
                  )}

                  <button
                    className="quick-action"
                    onClick={() =>
                      navigate('reports')
                    }
                  >
                    <div className="quick-icon purple-icon">
                      ▥
                    </div>

                    <div>
                      <strong>
                        View Reports
                      </strong>

                      <span>
                        Review system statistics
                      </span>
                    </div>

                    <b>→</b>
                  </button>

                </div>
              </div>

              <div className="panel overview-panel">

                <div className="panel-heading">
                  <div>
                    <span className="section-label">
                      SYSTEM OVERVIEW
                    </span>

                    <h3>
                      Current Activity
                    </h3>
                  </div>
                </div>

                <div className="overview-item">
                  <span className="overview-number">
                    {events.length}
                  </span>

                  <div>
                    <strong>Events</strong>
                    <p>
                      Registered in the system
                    </p>
                  </div>
                </div>

                <div className="overview-item">
                  <span className="overview-number">
                    {meetings.length}
                  </span>

                  <div>
                    <strong>Meetings</strong>
                    <p>
                      Scheduled meetings
                    </p>
                  </div>
                </div>

                <div className="overview-item">
                  <span className="overview-number">
                    {presentCount}
                  </span>

                  <div>
                    <strong>Present</strong>
                    <p>
                      Attendance confirmed
                    </p>
                  </div>
                </div>

              </div>

            </section>

            <section className="panel recent-panel">

              <div className="panel-heading">

                <div>
                  <span className="section-label">
                    RECENT EVENTS
                  </span>

                  <h3>
                    Upcoming County Events
                  </h3>
                </div>

                <button
                  className="text-button"
                  onClick={() =>
                    navigate('events')
                  }
                >
                  View all →
                </button>

              </div>

              {events.length === 0 ? (
                <div className="empty-state">

                  <div>▣</div>

                  <h4>
                    No events yet
                  </h4>

                  <p>
                    {isAdmin
                      ? 'Create your first county event to get started.'
                      : 'No county events have been registered yet.'}
                  </p>

                  {isAdmin && (
                    <button
                      className="primary-button"
                      onClick={() =>
                        navigate('create-event')
                      }
                    >
                      + Create Event
                    </button>
                  )}

                </div>
              ) : (
                <div className="mini-table">

                  {events
                    .slice(0, 5)
                    .map((event) => (
                      <div
                        className="mini-row"
                        key={
                          event.id ??
                          event.name
                        }
                      >

                        <div className="event-date">
                          <strong>
                            {event.date}
                          </strong>

                          <span>
                            {event.time}
                          </span>
                        </div>

                        <div>
                          <strong>
                            {event.name}
                          </strong>

                          <span>
                            {event.venue}
                          </span>
                        </div>

                        <span className="status-badge upcoming">
                          Upcoming
                        </span>

                      </div>
                    ))}

                </div>
              )}

            </section>
          </>
        )}

        {/* EVENTS */}

        {page === 'events' && (
          <section>

            <div className="page-header">

              <div>
                <span className="eyebrow">
                  EVENT MANAGEMENT
                </span>

                <h2>
                  County Events
                </h2>

                <p>
                  View and manage all registered county events.
                </p>
              </div>

              {isAdmin && (
                <button
                  className="primary-button"
                  onClick={() =>
                    navigate('create-event')
                  }
                >
                  + Create Event
                </button>
              )}

            </div>

            <div className="panel">

              {loading ? (
                <div className="loading-state">
                  Loading events...
                </div>
              ) : events.length === 0 ? (
                <div className="empty-state">

                  <div>▣</div>

                  <h4>
                    No events found
                  </h4>

                  <p>
                    {isAdmin
                      ? 'Start by creating a new county event.'
                      : 'No events have been registered.'}
                  </p>

                  {isAdmin && (
                    <button
                      className="primary-button"
                      onClick={() =>
                        navigate('create-event')
                      }
                    >
                      + Create Event
                    </button>
                  )}

                </div>
              ) : (
                <div className="table-container">

                  <table>

                    <thead>
                      <tr>
                        <th>Event</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Venue</th>

                        {isAdmin && (
                          <th>Action</th>
                        )}
                      </tr>
                    </thead>

                    <tbody>

                      {events.map((event) => (
                        <tr
                          key={
                            event.id ??
                            event.name
                          }
                        >

                          <td>
                            <strong>
                              {event.name}
                            </strong>

                            {event.description && (
                              <small>
                                {event.description}
                              </small>
                            )}
                          </td>

                          <td>
                            {event.date}
                          </td>

                          <td>
                            {event.time}
                          </td>

                          <td>
                            {event.venue}
                          </td>

                          {isAdmin && (
                            <td>

                              <button
                                className="secondary-button"
                                onClick={() =>
                                  editEvent(event)
                                }
                              >
                                Edit
                              </button>

                              <button
                                className="delete-button"
                                onClick={() =>
                                  deleteEvent(
                                    event.id,
                                  )
                                }
                              >
                                Delete
                              </button>

                            </td>
                          )}

                        </tr>
                      ))}

                    </tbody>

                  </table>

                </div>
              )}

            </div>

          </section>
        )}

        {/* CREATE EVENT */}

        {page === 'create-event' && isAdmin && (
          <section>

            <div className="page-header">

              <div>
                <span className="eyebrow">
                  EVENT MANAGEMENT
                </span>

                <h2>
                  Create New Event
                </h2>

                <p>
                  Add a new event to the county management system.
                </p>
              </div>

            </div>

            <form
              className="form-card"
              onSubmit={createEvent}
            >

              <div className="form-title">

                <div className="form-title-icon">
                  ▣
                </div>

                <div>
                  <h3>
                    Event Information
                  </h3>

                  <p>
                    Enter the details of the new event.
                  </p>
                </div>

              </div>

              <div className="form-grid">

                <div className="form-group full-width">
                  <label>
                    Event Name *
                  </label>

                  <input
                    type="text"
                    value={eventForm.name}
                    onChange={(e) =>
                      setEventForm({
                        ...eventForm,
                        name: e.target.value,
                      })
                    }
                    placeholder="e.g. County Staff Meeting"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Date *</label>

                  <input
                    type="date"
                    value={eventForm.date}
                    onChange={(e) =>
                      setEventForm({
                        ...eventForm,
                        date: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Time *</label>

                  <input
                    type="time"
                    value={eventForm.time}
                    onChange={(e) =>
                      setEventForm({
                        ...eventForm,
                        time: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="form-group full-width">
                  <label>Venue *</label>

                  <input
                    type="text"
                    value={eventForm.venue}
                    onChange={(e) =>
                      setEventForm({
                        ...eventForm,
                        venue: e.target.value,
                      })
                    }
                    placeholder="e.g. County Headquarters"
                    required
                  />
                </div>

                <div className="form-group full-width">
                  <label>
                    Description
                  </label>

                  <textarea
                    value={eventForm.description}
                    onChange={(e) =>
                      setEventForm({
                        ...eventForm,
                        description: e.target.value,
                      })
                    }
                    placeholder="Enter additional information..."
                    rows={5}
                  />
                </div>

              </div>

              <div className="form-actions">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    navigate('events')
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                >
                  Create Event
                </button>

              </div>

            </form>

          </section>
        )}

        {/* MEETINGS */}

        {page === 'meetings' && (
          <section>

            <div className="page-header">

              <div>
                <span className="eyebrow">
                  MEETING MANAGEMENT
                </span>

                <h2>
                  County Meetings
                </h2>

                <p>
                  Schedule and manage county meetings.
                </p>
              </div>

              {isAdmin && (
                <button
                  className="primary-button"
                  onClick={() =>
                    navigate('create-meeting')
                  }
                >
                  + Create Meeting
                </button>
              )}

            </div>

            <div className="panel">

              {loading ? (
                <div className="loading-state">
                  Loading meetings...
                </div>
              ) : meetings.length === 0 ? (
                <div className="empty-state">

                  <div>▤</div>

                  <h4>
                    No meetings found
                  </h4>

                  <p>
                    {isAdmin
                      ? 'Create a meeting to begin scheduling.'
                      : 'No meetings have been registered.'}
                  </p>

                </div>
              ) : (
                <div className="table-container">

                  <table>

                    <thead>
                      <tr>
                        <th>Meeting</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Venue</th>

                        {isAdmin && (
                          <th>Action</th>
                        )}
                      </tr>
                    </thead>

                    <tbody>

                      {meetings.map((meeting) => (
                        <tr
                          key={
                            meeting.id ??
                            meeting.title
                          }
                        >

                          <td>
                            <strong>
                              {meeting.title}
                            </strong>

                            {meeting.description && (
                              <small>
                                {meeting.description}
                              </small>
                            )}
                          </td>

                          <td>
                            {meeting.date}
                          </td>

                          <td>
                            {meeting.time}
                          </td>

                          <td>
                            {meeting.venue}
                          </td>

                          {isAdmin && (
                            <td>

                              <button
                                className="secondary-button"
                                onClick={() =>
                                  editMeeting(
                                    meeting,
                                  )
                                }
                              >
                                Edit
                              </button>

                              <button
                                className="delete-button"
                                onClick={() =>
                                  deleteMeeting(
                                    meeting.id,
                                  )
                                }
                              >
                                Delete
                              </button>

                            </td>
                          )}

                        </tr>
                      ))}

                    </tbody>

                  </table>

                </div>
              )}

            </div>

          </section>
        )}

        {/* CREATE MEETING */}

        {page === 'create-meeting' && isAdmin && (
          <section>

            <div className="page-header">

              <div>
                <span className="eyebrow">
                  MEETING MANAGEMENT
                </span>

                <h2>
                  Create New Meeting
                </h2>

                <p>
                  Schedule a new county meeting.
                </p>
              </div>

            </div>

            <form
              className="form-card"
              onSubmit={createMeeting}
            >

              <div className="form-title">

                <div className="form-title-icon">
                  ▤
                </div>

                <div>
                  <h3>
                    Meeting Information
                  </h3>

                  <p>
                    Enter the details of the meeting.
                  </p>
                </div>

              </div>

              <div className="form-grid">

                <div className="form-group full-width">
                  <label>
                    Meeting Title *
                  </label>

                  <input
                    type="text"
                    value={meetingForm.title}
                    onChange={(e) =>
                      setMeetingForm({
                        ...meetingForm,
                        title: e.target.value,
                      })
                    }
                    placeholder="e.g. Department Planning Meeting"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Date *</label>

                  <input
                    type="date"
                    value={meetingForm.date}
                    onChange={(e) =>
                      setMeetingForm({
                        ...meetingForm,
                        date: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Time *</label>

                  <input
                    type="time"
                    value={meetingForm.time}
                    onChange={(e) =>
                      setMeetingForm({
                        ...meetingForm,
                        time: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="form-group full-width">
                  <label>Venue *</label>

                  <input
                    type="text"
                    value={meetingForm.venue}
                    onChange={(e) =>
                      setMeetingForm({
                        ...meetingForm,
                        venue: e.target.value,
                      })
                    }
                    placeholder="e.g. County Boardroom"
                    required
                  />
                </div>

                <div className="form-group full-width">
                  <label>
                    Description
                  </label>

                  <textarea
                    value={meetingForm.description}
                    onChange={(e) =>
                      setMeetingForm({
                        ...meetingForm,
                        description: e.target.value,
                      })
                    }
                    placeholder="Enter meeting description..."
                    rows={5}
                  />
                </div>

              </div>

              <div className="form-actions">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    navigate('meetings')
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                >
                  Create Meeting
                </button>

              </div>

            </form>

          </section>
        )}

        {/* ATTENDANCE */}

        {page === 'attendance' && (
          <section>

            <div className="page-header">

              <div>
                <span className="eyebrow">
                  ATTENDANCE MANAGEMENT
                </span>

                <h2>
                  Meeting Attendance
                </h2>

                <p>
                  Record and monitor attendance for county meetings.
                </p>
              </div>

            </div>

            <div className="attendance-layout">

              {isAdmin && (
                <form
                  className="form-card attendance-form"
                  onSubmit={recordAttendance}
                >

                  <div className="form-title">

                    <div className="form-title-icon">
                      ✓
                    </div>

                    <div>
                      <h3>
                        Record Attendance
                      </h3>

                      <p>
                        Add an attendee to a meeting.
                      </p>
                    </div>

                  </div>

                  <div className="form-group">

                    <label>
                      Meeting *
                    </label>

                    <select
                      value={
                        attendanceForm.meeting_id
                      }
                      onChange={(e) =>
                        setAttendanceForm({
                          ...attendanceForm,
                          meeting_id:
                            e.target.value,
                        })
                      }
                      required
                    >

                      <option value="">
                        Select meeting
                      </option>

                      {meetings.map((meeting) => (
                        <option
                          key={meeting.id}
                          value={meeting.id}
                        >
                          {meeting.title}
                        </option>
                      ))}

                    </select>

                  </div>

                  <div className="form-group">

                    <label>
                      Attendee Name *
                    </label>

                    <input
                      type="text"
                      value={
                        attendanceForm.attendee_name
                      }
                      onChange={(e) =>
                        setAttendanceForm({
                          ...attendanceForm,
                          attendee_name:
                            e.target.value,
                        })
                      }
                      placeholder="Enter attendee name"
                      required
                    />

                  </div>

                  <div className="form-group">

                    <label>
                      Status *
                    </label>

                    <select
                      value={
                        attendanceForm.status
                      }
                      onChange={(e) =>
                        setAttendanceForm({
                          ...attendanceForm,
                          status:
                            e.target.value,
                        })
                      }
                    >
                      <option value="present">
                        Present
                      </option>

                      <option value="absent">
                        Absent
                      </option>
                    </select>

                  </div>

                  <button
                    type="submit"
                    className="primary-button full-button"
                  >
                    Record Attendance
                  </button>

                </form>
              )}

              <div className="panel attendance-list">

                <div className="panel-heading">

                  <div>
                    <span className="section-label">
                      ATTENDANCE RECORDS
                    </span>

                    <h3>
                      Recent Attendance
                    </h3>
                  </div>

                  <div className="attendance-summary">

                    <span className="present-pill">
                      {presentCount} Present
                    </span>

                    <span className="absent-pill">
                      {absentCount} Absent
                    </span>

                  </div>

                </div>

                {attendance.length === 0 ? (
                  <div className="empty-state compact">

                    <div>✓</div>

                    <h4>
                      No attendance records
                    </h4>

                    <p>
                      Attendance records will appear here.
                    </p>

                  </div>
                ) : (
                  <div className="attendance-records">

                    {attendance.map((record) => {

                      const meetingName =
                        record.meeting?.title ||
                        meetings.find(
                          (meeting) =>
                            meeting.id ===
                            record.meeting_id,
                        )?.title ||
                        `Meeting #${record.meeting_id}`

                      return (
                        <div
                          className="attendance-record"
                          key={record.id}
                        >

                          <div className="attendee-avatar">
                            {record.attendee_name
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div className="attendee-info">

                            <strong>
                              {record.attendee_name}
                            </strong>

                            <span>
                              {meetingName}
                            </span>

                          </div>

                          <span
                            className={`attendance-status ${record.status}`}
                          >
                            {record.status ===
                            'present'
                              ? 'Present'
                              : 'Absent'}
                          </span>

                          {isAdmin && (
                            <>
                              <button
                                className="secondary-button"
                                onClick={() =>
                                  editAttendance(
                                    record,
                                  )
                                }
                              >
                                Edit
                              </button>

                              <button
                                className="small-delete"
                                onClick={() =>
                                  deleteAttendance(
                                    record.id,
                                  )
                                }
                              >
                                ×
                              </button>
                            </>
                          )}

                        </div>
                      )
                    })}

                  </div>
                )}

              </div>

            </div>

          </section>
        )}

        {/* NOTIFICATIONS */}

        {page === 'notifications' && (
          <section>

            <div className="page-header">

              <div>
                <span className="eyebrow">
                  COMMUNICATIONS
                </span>

                <h2>
                  Notifications
                </h2>

                <p>
                  Stay informed about county activities.
                </p>
              </div>

            </div>

            <div className="notification-grid">

              <div className="notification-card">

                <div className="notification-icon green-notification">
                  ✓
                </div>

                <div>

                  <span className="notification-time">
                    SYSTEM
                  </span>

                  <h3>
                    System is operational
                  </h3>

                  <p>
                    The Events & Meetings Management
                    System is currently running normally.
                  </p>

                </div>

              </div>

              <div className="notification-card">

                <div className="notification-icon orange-notification">
                  !
                </div>

                <div>

                  <span className="notification-time">
                    MEETINGS
                  </span>

                  <h3>
                    Meeting management
                  </h3>

                  <p>
                    Remember to record attendance
                    after every county meeting.
                  </p>

                </div>

              </div>

              <div className="notification-card">

                <div className="notification-icon blue-notification">
                  ▣
                </div>

                <div>

                  <span className="notification-time">
                    EVENTS
                  </span>

                  <h3>
                    Event planning
                  </h3>

                  <p>
                    Keep event information updated
                    so county activities remain organised.
                  </p>

                </div>

              </div>

            </div>

            <div className="panel notification-info">

              <div className="large-notification-icon">
                🔔
              </div>

              <div>

                <h3>
                  Centralised County Communication
                </h3>

                <p>
                  This section provides a central place
                  for system messages, reminders and
                  important county management information.
                </p>

              </div>

            </div>

          </section>
        )}

        {/* REPORTS */}

        {page === 'reports' && (
          <section>

            <div className="page-header">

              <div>
                <span className="eyebrow">
                  REPORTING & ANALYTICS
                </span>

                <h2>
                  System Reports
                </h2>

                <p>
                  Review county events, meetings and attendance data.
                </p>
              </div>

              <button
                className="secondary-button"
                onClick={loadData}
              >
                ↻ Refresh Data
              </button>

            </div>

            <div className="report-stats">

              <div className="report-stat">
                <span>Total Events</span>
                <strong>
                  {events.length}
                </strong>
              </div>

              <div className="report-stat">
                <span>Total Meetings</span>
                <strong>
                  {meetings.length}
                </strong>
              </div>

              <div className="report-stat">
                <span>Attendance</span>
                <strong>
                  {attendance.length}
                </strong>
              </div>

              <div className="report-stat">
                <span>Present</span>
                <strong>
                  {presentCount}
                </strong>
              </div>

              <div className="report-stat">
                <span>Absent</span>
                <strong>
                  {absentCount}
                </strong>
              </div>

            </div>

            <div className="report-grid">

              <div className="panel">

                <div className="panel-heading">

                  <div>
                    <span className="section-label">
                      ATTENDANCE
                    </span>

                    <h3>
                      Attendance Report
                    </h3>
                  </div>

                </div>

                {attendance.length === 0 ? (
                  <div className="empty-state compact">
                    <p>
                      No attendance data available.
                    </p>
                  </div>
                ) : (
                  <div className="report-list">

                    {attendance.map((record) => {

                      const meetingName =
                        record.meeting?.title ||
                        meetings.find(
                          (meeting) =>
                            meeting.id ===
                            record.meeting_id,
                        )?.title ||
                        `Meeting #${record.meeting_id}`

                      return (
                        <div
                          className="report-list-item"
                          key={record.id}
                        >

                          <div>
                            <strong>
                              {record.attendee_name}
                            </strong>

                            <span>
                              {meetingName}
                            </span>
                          </div>

                          <span
                            className={`attendance-status ${record.status}`}
                          >
                            {record.status}
                          </span>

                        </div>
                      )
                    })}

                  </div>
                )}

              </div>

              <div className="panel">

                <div className="panel-heading">

                  <div>
                    <span className="section-label">
                      EVENTS
                    </span>

                    <h3>
                      Events Report
                    </h3>
                  </div>

                </div>

                {events.length === 0 ? (
                  <div className="empty-state compact">
                    <p>
                      No event data available.
                    </p>
                  </div>
                ) : (
                  <div className="report-list">

                    {events.map((event) => (
                      <div
                        className="report-list-item"
                        key={
                          event.id ??
                          event.name
                        }
                      >

                        <div>

                          <strong>
                            {event.name}
                          </strong>

                          <span>
                            {event.date} •{' '}
                            {event.venue}
                          </span>

                        </div>

                        <span className="status-badge upcoming">
                          Event
                        </span>

                      </div>
                    ))}

                  </div>
                )}

              </div>

            </div>

            <div className="panel">

              <div className="panel-heading">

                <div>
                  <span className="section-label">
                    MEETINGS
                  </span>

                  <h3>
                    Meetings Report
                  </h3>
                </div>

              </div>

              {meetings.length === 0 ? (
                <div className="empty-state compact">
                  <p>
                    No meeting data available.
                  </p>
                </div>
              ) : (
                <div className="table-container">

                  <table>

                    <thead>
                      <tr>
                        <th>Meeting</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Venue</th>
                      </tr>
                    </thead>

                    <tbody>

                      {meetings.map((meeting) => (
                        <tr
                          key={
                            meeting.id ??
                            meeting.title
                          }
                        >

                          <td>
                            <strong>
                              {meeting.title}
                            </strong>
                          </td>

                          <td>
                            {meeting.date}
                          </td>

                          <td>
                            {meeting.time}
                          </td>

                          <td>
                            {meeting.venue}
                          </td>

                        </tr>
                      ))}

                    </tbody>

                  </table>

                </div>
              )}

            </div>

          </section>
        )}

      </main>

      {/* FOOTER */}

      <footer className="footer">

        <div>
          <strong>
            Taita Taveta County
          </strong>

          <span>
            Events & Meetings Management System
          </span>
        </div>

        <span>
          © 2026 County Administration
        </span>

      </footer>

    </div>
  )
}

export default App