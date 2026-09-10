import { useState } from 'react'
import './App.css'

function App() {
  const [page, setPage] = useState<string>('dashboard')

  const events = [
    {
      name: 'County Staff Meeting',
      date: '2026-09-12',
      time: '10:00',
      venue: 'County Headquarters',
    },
  ]

  return (
    <div className="app">

      <header className="header">
        <h1>Taita Taveta County</h1>
        <p>Events & Meetings Management System</p>
      </header>

      <nav className="navigation">
        <button onClick={() => setPage('dashboard')}>Dashboard</button>
        <button onClick={() => setPage('events')}>Events</button>
        <button onClick={() => setPage('meetings')}>Meetings</button>
        <button onClick={() => setPage('attendance')}>Attendance</button>
        <button onClick={() => setPage('notifications')}>Notifications</button>
      </nav>

      <main className="content">

        {/* DASHBOARD */}
        {page === 'dashboard' && (
          <>
            <h2>Dashboard</h2>

            <div className="cards">
              <div className="card">
                <h3>Upcoming Events</h3>
                <p>1</p>
              </div>

              <div className="card">
                <h3>Meetings</h3>
                <p>2</p>
              </div>

              <div className="card">
                <h3>Attendance</h3>
                <p>120</p>
              </div>

              <div className="card">
                <h3>Notifications</h3>
                <p>3</p>
              </div>
            </div>
          </>
        )}

        {/* EVENTS */}
        {page === 'events' && (
          <section className="events">
            <h2>Upcoming Events</h2>

            <button
              className="create-button"
              onClick={() => setPage('create-event')}
            >
              + Create Event
            </button>

            {events.map((event) => (
              <div className="event" key={event.name}>
                <h3>{event.name}</h3>
                <p><strong>Date:</strong> {event.date}</p>
                <p><strong>Time:</strong> {event.time}</p>
                <p><strong>Venue:</strong> {event.venue}</p>
              </div>
            ))}
          </section>
        )}

        {/* CREATE EVENT */}
        {page === 'create-event' && (
          <section className="form-section">
            <h2>Create New Event</h2>

            <form>
              <label>Event Name</label>
              <input type="text" placeholder="Enter event name" />

              <label>Date</label>
              <input type="date" />

              <label>Time</label>
              <input type="time" />

              <label>Venue</label>
              <input type="text" placeholder="Enter venue" />

              <label>Organizer</label>
              <input type="text" placeholder="Enter organizer" />

              <label>Description</label>
              <textarea placeholder="Enter event description"></textarea>

              <button type="submit" className="create-button">
                Save Event
              </button>

              <button
                type="button"
                onClick={() => setPage('events')}
              >
                Back to Events
              </button>
            </form>
          </section>
        )}

        {/* MEETINGS */}
        {page === 'meetings' && (
          <section className="events">
            <h2>Meetings</h2>

            <div className="event">
              <h3>County Management Meeting</h3>
              <p><strong>Date:</strong> 2026-09-18</p>
              <p><strong>Time:</strong> 10:00</p>
              <p><strong>Venue:</strong> County Headquarters</p>
              <p><strong>Status:</strong> Scheduled</p>
            </div>

            <div className="event">
              <h3>Department Heads Meeting</h3>
              <p><strong>Date:</strong> 2026-09-20</p>
              <p><strong>Time:</strong> 09:00</p>
              <p><strong>Venue:</strong> County Hall</p>
              <p><strong>Status:</strong> Scheduled</p>
            </div>
          </section>
        )}

        {/* ATTENDANCE */}
        {page === 'attendance' && (
          <section className="events">
            <h2>Attendance</h2>

            <div className="event">
              <h3>County Staff Meeting</h3>
              <p><strong>Total Participants:</strong> 45</p>
              <p><strong>Present:</strong> 40</p>
              <p><strong>Absent:</strong> 5</p>
              <p><strong>Attendance Rate:</strong> 89%</p>
            </div>

            <div className="event">
              <h3>Public Participation Forum</h3>
              <p><strong>Total Participants:</strong> 80</p>
              <p><strong>Present:</strong> 72</p>
              <p><strong>Absent:</strong> 8</p>
              <p><strong>Attendance Rate:</strong> 90%</p>
            </div>
          </section>
        )}

        {/* NOTIFICATIONS */}
        {page === 'notifications' && (
          <section className="events">
            <h2>Notifications</h2>

            <div className="event">
              <h3>📅 Upcoming Meeting</h3>
              <p>
                County Management Meeting is scheduled for
                18 September 2026.
              </p>
            </div>

            <div className="event">
              <h3>📢 Attendance Reminder</h3>
              <p>
                Remember to confirm attendance for the upcoming meeting.
              </p>
            </div>

            <div className="event">
              <h3>🔔 New Event</h3>
              <p>
                A new public participation event has been added.
              </p>
            </div>
          </section>
        )}

      </main>
    </div>
  )
}

export default App