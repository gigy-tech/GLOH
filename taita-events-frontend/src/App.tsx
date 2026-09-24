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
  | 'account'

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
  role:
    | 'super_admin'
    | 'admin'
    | 'ict_admin'
    | 'meeting_admin'
    | 'department_admin'
    | 'organiser'
    | 'manager'
    | 'hr'
    | 'senior_management'
    | 'auditor'
    | 'employee'
    | 'user'
  department?: string
  position?: string
  permissions?: string[]
}

const API_URL = 'http://127.0.0.1:8000/api'

function App() {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('county_user')
    return saved ? JSON.parse(saved) : null
  })

  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('county_token'),
  )

  // ============================================================
  // NORMAL LOGIN
  // ============================================================

  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
  })

  // ============================================================
  // EXISTING EMPLOYEE VERIFICATION
  // ============================================================

  const [otp, setOtp] = useState('')
  const [employeeId, setEmployeeId] = useState<number | null>(null)
  const [otpSent, setOtpSent] = useState(false)
  const [showEmployeeVerification, setShowEmployeeVerification] =
    useState(false)

  const [passwordSetup, setPasswordSetup] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)

  // ============================================================
  // NEW EMPLOYEE SELF-REGISTRATION
  // ============================================================

  const [showRegistration, setShowRegistration] = useState(false)

  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    position: '',
  })

  const [registrationId, setRegistrationId] = useState<number | null>(
    null,
  )

  const [registrationOtp, setRegistrationOtp] = useState('')

  const [registrationStep, setRegistrationStep] = useState<
    'form' | 'otp' | 'password'
  >('form')

  const [registrationPassword, setRegistrationPassword] = useState('')
  const [registrationConfirmPassword, setRegistrationConfirmPassword] =
    useState('')

  const [registrationError, setRegistrationError] = useState('')
  const [registrationLoading, setRegistrationLoading] = useState(false)

  // ============================================================
  // GENERAL
  // ============================================================

  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')

  const [page, setPage] = useState<Page>('dashboard')
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  const [events, setEvents] = useState<Event[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [loading, setLoading] = useState(false)

  // ============================================================
  // EVENT FORM
  // ============================================================

  const [eventForm, setEventForm] = useState({
    name: '',
    date: '',
    time: '',
    venue: '',
    description: '',
  })

  // ============================================================
  // MEETING FORM
  // ============================================================

  const [meetingForm, setMeetingForm] = useState({
    title: '',
    date: '',
    time: '',
    venue: '',
    description: '',
  })

  // ============================================================
  // ATTENDANCE FORM
  // ============================================================

  const [attendanceForm, setAttendanceForm] = useState({
    meeting_id: '',
    attendee_name: '',
    status: 'present' as 'present' | 'absent',
  })

  // ============================================================
  // ROLE PERMISSIONS
  // ============================================================

  const rolePermissions: Record<string, string[]> = {
    super_admin: [
      'meetings.create',
      'meetings.update',
      'meetings.publish',
      'meetings.cancel',
      'participants.manage',
      'attendance.capture',
      'attendance.verify',
      'attendance.correct',
      'reports.view',
      'reports.export',
      'analytics.view',
      'users.manage',
      'roles.manage',
      'audit.view',
    ],

    admin: [
      'meetings.create',
      'meetings.update',
      'meetings.publish',
      'meetings.cancel',
      'participants.manage',
      'attendance.capture',
      'attendance.verify',
      'attendance.correct',
      'reports.view',
      'reports.export',
      'analytics.view',
      'users.manage',
      'roles.manage',
      'audit.view',
    ],

    ict_admin: [
      'users.manage',
      'roles.manage',
      'audit.view',
      'reports.view',
      'analytics.view',
    ],

    meeting_admin: [
      'meetings.create',
      'meetings.update',
      'meetings.publish',
      'meetings.cancel',
      'participants.manage',
      'attendance.capture',
      'attendance.verify',
      'attendance.correct',
      'reports.view',
      'reports.export',
    ],

    department_admin: [
      'meetings.create',
      'meetings.update',
      'participants.manage',
      'attendance.capture',
      'attendance.verify',
      'attendance.correct',
      'reports.view',
      'reports.export',
    ],

    organiser: [
      'meetings.create',
      'meetings.update',
      'participants.manage',
      'attendance.capture',
      'attendance.verify',
      'reports.view',
    ],

    manager: [
      'reports.view',
      'analytics.view',
    ],

    hr: [
      'reports.view',
      'reports.export',
    ],

    senior_management: [
      'reports.view',
      'reports.export',
      'analytics.view',
    ],

    auditor: [
      'reports.view',
      'audit.view',
    ],

    employee: [
      'reports.view',
    ],

    user: [
      'reports.view',
    ],
  }

  const can = (permission: string) => {
    if (!user) return false

    return (
      user.permissions ??
      rolePermissions[user.role] ??
      []
    ).includes(permission)
  }

  const canManageMeetings =
    can('meetings.create') || can('meetings.update')

  // ============================================================
  // AUTH HEADERS
  // ============================================================

  const authHeaders = (): HeadersInit => ({
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),
  })

  // ============================================================
  // SAVE AUTHENTICATION
  // ============================================================

  const saveAuthentication = (
    newToken: string,
    newUser: User,
  ) => {
    localStorage.setItem('county_token', newToken)
    localStorage.setItem(
      'county_user',
      JSON.stringify(newUser),
    )

    setToken(newToken)
    setUser(newUser)
  }

  // ============================================================
  // NORMAL LOGIN
  // ============================================================

  const login = async (e: FormEvent) => {
    e.preventDefault()

    if (!loginForm.email.trim() || !loginForm.password) {
      setLoginError(
        'Enter your email and password.',
      )
      return
    }

    setLoginLoading(true)
    setLoginError('')

    try {
      const response = await fetch(
        `${API_URL}/login`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: loginForm.email.trim(),
            password: loginForm.password,
          }),
        },
      )

      const text = await response.text()

      console.log(
        'Raw Laravel login response:',
        text,
      )

      const cleanText = text
        .trim()
        .replace(/^`+|`+$/g, '')

      const data = JSON.parse(cleanText)

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Invalid email or password.',
        )
      }

      if (!data.token || !data.user) {
        throw new Error(
          'Login response is missing authentication details.',
        )
      }

      saveAuthentication(
        data.token,
        data.user,
      )

      setLoginForm({
        email: '',
        password: '',
      })

      setLoginError('')
      setPage('dashboard')
    } catch (error) {
      console.error(
        'Login error:',
        error,
      )

      setLoginError(
        error instanceof Error
          ? error.message
          : 'Unable to sign in.',
      )
    } finally {
      setLoginLoading(false)
    }
  }

  // ============================================================
  // EXISTING EMPLOYEE - SEND OTP
  // ============================================================

  const sendEmployeeOtp = async () => {
    if (!loginForm.email.trim()) {
      setLoginError(
        'Enter your government email first.',
      )
      return
    }

    setLoginLoading(true)
    setLoginError('')

    try {
      const response = await fetch(
        `${API_URL}/verify-employee-email`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: loginForm.email.trim(),
          }),
        },
      )

      const text = await response.text()

      console.log(
        'Raw Laravel response:',
        text,
      )

      const cleanText = text
        .trim()
        .replace(/^`+|`+$/g, '')

      const data = JSON.parse(cleanText)

      console.log(
        'Laravel response:',
        data,
      )

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Failed to send OTP.',
        )
      }

      setEmployeeId(
        data.employee_id,
      )

      setOtpSent(true)
      setLoginError('')

      console.log(
        'OTP sent successfully. Employee ID:',
        data.employee_id,
      )
    } catch (error) {
      console.error(
        'OTP error:',
        error,
      )

      setLoginError(
        error instanceof Error
          ? error.message
          : 'Failed to send OTP.',
      )
    } finally {
      setLoginLoading(false)
    }
  }

  // ============================================================
  // EXISTING EMPLOYEE - VERIFY OTP
  // ============================================================

  const verifyEmployeeOtp = async (
    e: FormEvent,
  ) => {
    e.preventDefault()

    if (!employeeId) {
      setLoginError(
        'Please request an OTP first.',
      )
      return
    }

    if (otp.length !== 6) {
      setLoginError(
        'Enter the 6-digit OTP.',
      )
      return
    }

    setLoginLoading(true)
    setLoginError('')

    try {
      const response = await fetch(
        `${API_URL}/verify-employee-otp`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            employee_id: employeeId,
            otp,
          }),
        },
      )

      const text = await response.text()

      console.log(
        'Raw Laravel OTP response:',
        text,
      )

      const cleanText = text
        .trim()
        .replace(/^`+|`+$/g, '')

      const data = JSON.parse(cleanText)

      console.log(
        'Laravel OTP response:',
        data,
      )

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Invalid or expired OTP.',
        )
      }

      console.log(
        'OTP verified successfully.',
      )

      console.log(
        'Password set:',
        data.password_set,
      )

      if (data.password_set === false) {
        setPasswordSetup(true)
        setOtp('')
        setLoginError('')
        return
      }

      setOtp('')
      setEmployeeId(null)
      setOtpSent(false)
      setPasswordSetup(false)
      setShowEmployeeVerification(false)

      setLoginForm((current) => ({
        email: current.email,
        password: '',
      }))

      setLoginError(
        'Password already exists. Please sign in with your email and password.',
      )
    } catch (error) {
      console.error(
        'OTP verification error:',
        error,
      )

      setLoginError(
        error instanceof Error
          ? error.message
          : 'OTP verification failed.',
      )
    } finally {
      setLoginLoading(false)
    }
  }

  // ============================================================
  // EXISTING EMPLOYEE - SET PASSWORD
  // ============================================================

  const setEmployeePassword = async (
    e: FormEvent,
  ) => {
    e.preventDefault()

    setPasswordError('')
    setPasswordLoading(true)

    if (newPassword.length < 8) {
      setPasswordError(
        'Password must be at least 8 characters.',
      )

      setPasswordLoading(false)
      return
    }

    if (
      newPassword !==
      confirmPassword
    ) {
      setPasswordError(
        'Passwords do not match.',
      )

      setPasswordLoading(false)
      return
    }

    if (!employeeId) {
      setPasswordError(
        'Employee verification information is missing.',
      )

      setPasswordLoading(false)
      return
    }

    try {
      const response = await fetch(
        `${API_URL}/set-password`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            employee_id: employeeId,
            password: newPassword,
            password_confirmation:
              confirmPassword,
          }),
        },
      )

      const text = await response.text()

      console.log(
        'Raw password response:',
        text,
      )

      const cleanText = text
        .trim()
        .replace(/^`+|`+$/g, '')

      const data = JSON.parse(cleanText)

      console.log(
        'Password response:',
        data,
      )

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Unable to create password.',
        )
      }

      setPasswordSetup(false)
      setShowEmployeeVerification(false)
      setNewPassword('')
      setConfirmPassword('')
      setOtp('')
      setEmployeeId(null)
      setOtpSent(false)

      setLoginForm((current) => ({
        email: current.email,
        password: '',
      }))

      setLoginError('')
      setPasswordError('')

      alert(
        'Password created successfully. You can now log in with your government email and password.',
      )
    } catch (error) {
      console.error(
        'Password creation error:',
        error,
      )

      setPasswordError(
        error instanceof Error
          ? error.message
          : 'Unable to create password.',
      )
    } finally {
      setPasswordLoading(false)
    }
  }

  // ============================================================
  // NEW REGISTRATION - START
  // ============================================================

  const startRegistration = async (
    e: FormEvent,
  ) => {
    e.preventDefault()

    setRegistrationError('')

    if (!registerForm.name.trim()) {
      setRegistrationError(
        'Enter your full name.',
      )
      return
    }

    if (!registerForm.email.trim()) {
      setRegistrationError(
        'Enter your email address.',
      )
      return
    }

    setRegistrationLoading(true)

    try {
      const response = await fetch(
        `${API_URL}/register`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: registerForm.name.trim(),
            email: registerForm.email.trim(),
            phone: registerForm.phone.trim(),
            department:
              registerForm.department.trim(),
            position:
              registerForm.position.trim(),
          }),
        },
      )

      const text = await response.text()

      console.log(
        'Raw registration response:',
        text,
      )

      const cleanText = text
        .trim()
        .replace(/^`+|`+$/g, '')

      const data = JSON.parse(cleanText)

      console.log(
        'Registration response:',
        data,
      )

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Unable to start registration.',
        )
      }

      if (!data.registration_id) {
        throw new Error(
          'Registration response is missing the registration ID.',
        )
      }

      setRegistrationId(
        data.registration_id,
      )

      setRegistrationStep('otp')
      setRegistrationError('')

      alert(
        'Registration started. Check your email for the 6-digit verification OTP.',
      )
    } catch (error) {
      console.error(
        'Registration error:',
        error,
      )

      setRegistrationError(
        error instanceof Error
          ? error.message
          : 'Unable to start registration.',
      )
    } finally {
      setRegistrationLoading(false)
    }
  }

  // ============================================================
  // NEW REGISTRATION - VERIFY OTP
  // ============================================================

  const verifyRegistrationOtp = async (
    e: FormEvent,
  ) => {
    e.preventDefault()

    setRegistrationError('')

    if (!registrationId) {
      setRegistrationError(
        'Registration information is missing. Please register again.',
      )
      return
    }

    if (registrationOtp.length !== 6) {
      setRegistrationError(
        'Enter the 6-digit OTP.',
      )
      return
    }

    setRegistrationLoading(true)

    try {
      const response = await fetch(
        `${API_URL}/verify-registration-otp`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            registration_id:
              registrationId,
            otp: registrationOtp,
          }),
        },
      )

      const text = await response.text()

      console.log(
        'Raw registration OTP response:',
        text,
      )

      const cleanText = text
        .trim()
        .replace(/^`+|`+$/g, '')

      const data = JSON.parse(cleanText)

      console.log(
        'Registration OTP response:',
        data,
      )

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Invalid or expired OTP.',
        )
      }

      setRegistrationStep('password')
      setRegistrationOtp('')
      setRegistrationError('')
    } catch (error) {
      console.error(
        'Registration OTP error:',
        error,
      )

      setRegistrationError(
        error instanceof Error
          ? error.message
          : 'Unable to verify the OTP.',
      )
    } finally {
      setRegistrationLoading(false)
    }
  }

  // ============================================================
  // NEW REGISTRATION - COMPLETE
  // ============================================================

  const completeRegistration = async (
    e: FormEvent,
  ) => {
    e.preventDefault()

    setRegistrationError('')

    if (!registrationId) {
      setRegistrationError(
        'Registration information is missing. Please register again.',
      )
      return
    }

    if (
      registrationPassword.length < 8
    ) {
      setRegistrationError(
        'Password must be at least 8 characters.',
      )
      return
    }

    if (
      registrationPassword !==
      registrationConfirmPassword
    ) {
      setRegistrationError(
        'Passwords do not match.',
      )
      return
    }

    setRegistrationLoading(true)

    try {
      const response = await fetch(
        `${API_URL}/complete-registration`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            registration_id:
              registrationId,
            password:
              registrationPassword,
            password_confirmation:
              registrationConfirmPassword,
          }),
        },
      )

      const text = await response.text()

      console.log(
        'Raw complete registration response:',
        text,
      )

      const cleanText = text
        .trim()
        .replace(/^`+|`+$/g, '')

      const data = JSON.parse(cleanText)

      console.log(
        'Complete registration response:',
        data,
      )

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Unable to complete registration.',
        )
      }

      if (!data.token || !data.user) {
        throw new Error(
          'Registration completed, but authentication details were not returned.',
        )
      }

      saveAuthentication(
        data.token,
        data.user,
      )

      setRegisterForm({
        name: '',
        email: '',
        phone: '',
        department: '',
        position: '',
      })

      setRegistrationId(null)
      setRegistrationOtp('')
      setRegistrationStep('form')
      setRegistrationPassword('')
      setRegistrationConfirmPassword('')
      setRegistrationError('')
      setShowRegistration(false)

      setPage('dashboard')

      alert(
        'Registration completed successfully. Welcome to the Taita Taveta County Events & Meetings Management System.',
      )
    } catch (error) {
      console.error(
        'Complete registration error:',
        error,
      )

      setRegistrationError(
        error instanceof Error
          ? error.message
          : 'Unable to complete registration.',
      )
    } finally {
      setRegistrationLoading(false)
    }
  }

  // ============================================================
  // CANCEL REGISTRATION
  // ============================================================

  const cancelRegistration = () => {
    setShowRegistration(false)

    setRegisterForm({
      name: '',
      email: '',
      phone: '',
      department: '',
      position: '',
    })

    setRegistrationId(null)
    setRegistrationOtp('')
    setRegistrationStep('form')
    setRegistrationPassword('')
    setRegistrationConfirmPassword('')
    setRegistrationError('')
  }

  // ============================================================
  // LOGOUT
  // ============================================================

  const logout = async () => {
    try {
      if (token) {
        await fetch(
          `${API_URL}/logout`,
          {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${token}`,
            },
          },
        )
      }
    } catch {
      // Local authentication is still cleared
      // if the server is unavailable.
    } finally {
      localStorage.removeItem(
        'county_token',
      )

      localStorage.removeItem(
        'county_user',
      )

      setToken(null)
      setUser(null)

      setEvents([])
      setMeetings([])
      setAttendance([])

      setPage('dashboard')
      setMenuOpen(false)

      setOtp('')
      setEmployeeId(null)
      setOtpSent(false)
      setShowEmployeeVerification(false)
      setPasswordSetup(false)

      setNewPassword('')
      setConfirmPassword('')

      setShowRegistration(false)

      setRegistrationId(null)
      setRegistrationOtp('')
      setRegistrationStep('form')
      setRegistrationPassword('')
      setRegistrationConfirmPassword('')

      setLoginError('')
      setRegistrationError('')
    }
  }

  // ============================================================
  // LOAD SYSTEM DATA
  // ============================================================

  const loadData = async () => {
    if (!token) return

    setLoading(true)

    try {
      const [
        eventsResponse,
        meetingsResponse,
        attendanceResponse,
      ] = await Promise.all([
        fetch(
          `${API_URL}/events`,
          {
            headers: authHeaders(),
          },
        ),

        fetch(
          `${API_URL}/meetings`,
          {
            headers: authHeaders(),
          },
        ),

        fetch(
          `${API_URL}/attendances`,
          {
            headers: authHeaders(),
          },
        ),
      ])

      if (
        eventsResponse.status === 401 ||
        meetingsResponse.status === 401 ||
        attendanceResponse.status === 401
      ) {
        await logout()
        return
      }

      const eventsData =
        await eventsResponse.json()

      const meetingsData =
        await meetingsResponse.json()

      const attendanceData =
        await attendanceResponse.json()

      if (eventsResponse.ok) {
        setEvents(
          Array.isArray(eventsData)
            ? eventsData
            : eventsData.events ??
                eventsData.data ??
                [],
        )
      }

      if (meetingsResponse.ok) {
        setMeetings(
          Array.isArray(meetingsData)
            ? meetingsData
            : meetingsData.meetings ??
                meetingsData.data ??
                [],
        )
      }

      if (attendanceResponse.ok) {
        setAttendance(
          Array.isArray(
            attendanceData,
          )
            ? attendanceData
            : attendanceData.attendances ??
                attendanceData.data ??
                [],
        )
      }
    } catch (error) {
      console.error(
        'Unable to load system data:',
        error,
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) {
      loadData()
    }
  }, [token])

  // ============================================================
  // NAVIGATION
  // ============================================================

  const navigate = (
    destination: Page,
  ) => {
    setPage(destination)
    setMenuOpen(false)
    setProfileOpen(false)
  }

  // ============================================================
  // CREATE EVENT
  // ============================================================

  const createEvent = async (
    e: FormEvent,
  ) => {
    e.preventDefault()

    if (!can('meetings.create')) {
      alert(
        'You do not have permission to create events.',
      )
      return
    }

    try {
      const response = await fetch(
        `${API_URL}/events`,
        {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(
            eventForm,
          ),
        },
      )

      if (response.status === 401) {
        await logout()
        return
      }

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Unable to create event.',
        )
      }

      setEvents((current) => [
        ...current,
        data.event ??
          data.data ??
          data,
      ])

      setEventForm({
        name: '',
        date: '',
        time: '',
        venue: '',
        description: '',
      })

      alert(
        'Event created successfully.',
      )

      navigate('events')
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Unable to create event.',
      )
    }
  }

  // ============================================================
  // EDIT EVENT
  // ============================================================

  const editEvent = async (
    event: Event,
  ) => {
    if (
      !can('meetings.update') ||
      !event.id
    ) {
      return
    }

    const name = window.prompt(
      'Event name:',
      event.name,
    )

    if (name === null) return

    const date = window.prompt(
      'Date (YYYY-MM-DD):',
      event.date,
    )

    if (date === null) return

    const time = window.prompt(
      'Time:',
      event.time,
    )

    if (time === null) return

    const venue = window.prompt(
      'Venue:',
      event.venue,
    )

    if (venue === null) return

    try {
      const response = await fetch(
        `${API_URL}/events/${event.id}`,
        {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify({
            name,
            date,
            time,
            venue,
            description:
              event.description ?? '',
          }),
        },
      )

      if (response.status === 401) {
        await logout()
        return
      }

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Unable to update event.',
        )
      }

      const updated =
        data.event ??
        data.data ??
        data

      setEvents((current) =>
        current.map((item) =>
          item.id === event.id
            ? updated
            : item,
        ),
      )

      alert(
        'Event updated successfully.',
      )
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Unable to update event.',
      )
    }
  }

  // ============================================================
  // DELETE EVENT
  // ============================================================

  const deleteEvent = async (
    id?: number,
  ) => {
    if (
      !can('meetings.update') ||
      !id
    ) {
      return
    }

    if (
      !window.confirm(
        'Are you sure you want to delete this event?',
      )
    ) {
      return
    }

    try {
      const response = await fetch(
        `${API_URL}/events/${id}`,
        {
          method: 'DELETE',
          headers: authHeaders(),
        },
      )

      if (response.status === 401) {
        await logout()
        return
      }

      const data =
        await response
          .json()
          .catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Unable to delete event.',
        )
      }

      setEvents((current) =>
        current.filter(
          (event) =>
            event.id !== id,
        ),
      )

      alert(
        'Event deleted successfully.',
      )
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Unable to delete event.',
      )
    }
  }

  // ============================================================
  // CREATE MEETING
  // ============================================================

  const createMeeting = async (
    e: FormEvent,
  ) => {
    e.preventDefault()

    if (!can('meetings.create')) {
      alert(
        'You do not have permission to create meetings.',
      )
      return
    }

    try {
      const response = await fetch(
        `${API_URL}/meetings`,
        {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(
            meetingForm,
          ),
        },
      )

      if (response.status === 401) {
        await logout()
        return
      }

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Unable to create meeting.',
        )
      }

      setMeetings((current) => [
        ...current,
        data.meeting ??
          data.data ??
          data,
      ])

      setMeetingForm({
        title: '',
        date: '',
        time: '',
        venue: '',
        description: '',
      })

      alert(
        'Meeting created successfully.',
      )

      navigate('meetings')
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Unable to create meeting.',
      )
    }
  }

  // ============================================================
  // EDIT MEETING
  // ============================================================

  const editMeeting = async (
    meeting: Meeting,
  ) => {
    if (
      !can('meetings.update') ||
      !meeting.id
    ) {
      return
    }

    const title = window.prompt(
      'Meeting title:',
      meeting.title,
    )

    if (title === null) return

    const date = window.prompt(
      'Date (YYYY-MM-DD):',
      meeting.date,
    )

    if (date === null) return

    const time = window.prompt(
      'Time:',
      meeting.time,
    )

    if (time === null) return

    const venue = window.prompt(
      'Venue:',
      meeting.venue,
    )

    if (venue === null) return

    try {
      const response = await fetch(
        `${API_URL}/meetings/${meeting.id}`,
        {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify({
            title,
            date,
            time,
            venue,
            description:
              meeting.description ?? '',
          }),
        },
      )

      if (response.status === 401) {
        await logout()
        return
      }

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Unable to update meeting.',
        )
      }

      const updated =
        data.meeting ??
        data.data ??
        data

      setMeetings((current) =>
        current.map((item) =>
          item.id === meeting.id
            ? updated
            : item,
        ),
      )

      alert(
        'Meeting updated successfully.',
      )
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Unable to update meeting.',
      )
    }
  }

  // ============================================================
  // DELETE MEETING
  // ============================================================

  const deleteMeeting = async (
    id?: number,
  ) => {
    if (
      !can('attendance.correct') ||
      !id
    ) {
      return
    }

    if (
      !window.confirm(
        'Are you sure you want to delete this meeting?',
      )
    ) {
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

      if (response.status === 401) {
        await logout()
        return
      }

      const data =
        await response
          .json()
          .catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Unable to delete meeting.',
        )
      }

      setMeetings((current) =>
        current.filter(
          (meeting) =>
            meeting.id !== id,
        ),
      )

      alert(
        'Meeting deleted successfully.',
      )
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Unable to delete meeting.',
      )
    }
  }

  // ============================================================
  // RECORD ATTENDANCE
  // ============================================================

  const recordAttendance = async (
    e: FormEvent,
  ) => {
    e.preventDefault()

    if (!can('attendance.capture')) {
      alert(
        'You do not have permission to record attendance.',
      )
      return
    }

    if (
      !attendanceForm.meeting_id ||
      !attendanceForm.attendee_name.trim()
    ) {
      alert(
        'Please select a meeting and enter the attendee name.',
      )
      return
    }

    try {
      const response = await fetch(
        `${API_URL}/attendances`,
        {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            meeting_id: Number(
              attendanceForm.meeting_id,
            ),
            attendee_name:
              attendanceForm.attendee_name.trim(),
            status:
              attendanceForm.status,
          }),
        },
      )

      if (response.status === 401) {
        await logout()
        return
      }

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Unable to record attendance.',
        )
      }

      setAttendance((current) => [
        ...current,
        data.attendance ??
          data.data ??
          data,
      ])

      setAttendanceForm({
        meeting_id: '',
        attendee_name: '',
        status: 'present',
      })

      alert(
        'Attendance recorded successfully.',
      )
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Unable to record attendance.',
      )
    }
  }

  // ============================================================
  // EDIT ATTENDANCE
  // ============================================================

  const editAttendance = async (
    record: Attendance,
  ) => {
    if (
      !can('attendance.correct') ||
      !record.id
    ) {
      return
    }

    const attendeeName =
      window.prompt(
        'Attendee name:',
        record.attendee_name,
      )

    if (attendeeName === null) {
      return
    }

    const statusInput =
      window.prompt(
        'Status (present or absent):',
        record.status,
      )

    if (statusInput === null) {
      return
    }

    const status =
      statusInput.toLowerCase()

    if (
      status !== 'present' &&
      status !== 'absent'
    ) {
      alert(
        'Status must be present or absent.',
      )
      return
    }

    try {
      const response = await fetch(
        `${API_URL}/attendances/${record.id}`,
        {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify({
            meeting_id:
              record.meeting_id,
            attendee_name:
              attendeeName.trim(),
            status,
          }),
        },
      )

      if (response.status === 401) {
        await logout()
        return
      }

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Unable to update attendance.',
        )
      }

      const updated =
        data.attendance ??
        data.data ??
        data

      setAttendance((current) =>
        current.map((item) =>
          item.id === record.id
            ? updated
            : item,
        ),
      )

      alert(
        'Attendance updated successfully.',
      )
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Unable to update attendance.',
      )
    }
  }

  // ============================================================
  // DELETE ATTENDANCE
  // ============================================================

  const deleteAttendance = async (
    id?: number,
  ) => {
    if (
      !can('attendance.correct') ||
      !id
    ) {
      return
    }

    if (
      !window.confirm(
        'Are you sure you want to delete this attendance record?',
      )
    ) {
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

      if (response.status === 401) {
        await logout()
        return
      }

      const data =
        await response
          .json()
          .catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Unable to delete attendance.',
        )
      }

      setAttendance((current) =>
        current.filter(
          (item) =>
            item.id !== id,
        ),
      )

      alert(
        'Attendance deleted successfully.',
      )
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Unable to delete attendance.',
      )
    }
  }

  // ============================================================
  // ATTENDANCE COUNTS
  // ============================================================

  const presentCount =
    attendance.filter(
      (record) =>
        record.status === 'present',
    ).length

  const absentCount =
    attendance.filter(
      (record) =>
        record.status === 'absent',
    ).length

  // ============================================================
  // LOGIN / REGISTRATION SCREEN
  // ============================================================

  if (!user || !token) {
    return (
      <div className="login-page">
        <div className="login-card">

          <div className="login-logo">
            TT
          </div>

          <span className="eyebrow">
            COUNTY MANAGEMENT PORTAL
          </span>

          <h1>
            Taita Taveta County
          </h1>

          <p className="login-subtitle">
            Events & Meetings Management System
          </p>

          {/* ==================================================
              NEW REGISTRATION
          ================================================== */}

          {showRegistration ? (
            <>
              {registrationStep === 'form' && (
                <form
                  onSubmit={startRegistration}
                  className="employee-login"
                >
                  <h2>
                    Create Employee Account
                  </h2>

                  <p>
                    Register using your email
                    address. A verification OTP
                    will be sent to your email.
                  </p>

                  <label>
                    Full Name
                  </label>

                  <input
                    type="text"
                    value={
                      registerForm.name
                    }
                    onChange={(e) =>
                      setRegisterForm({
                        ...registerForm,
                        name:
                          e.target.value,
                      })
                    }
                    placeholder="Enter your full name"
                    required
                  />

                  <label>
                    Email Address
                  </label>

                  <input
                    type="email"
                    value={
                      registerForm.email
                    }
                    onChange={(e) =>
                      setRegisterForm({
                        ...registerForm,
                        email:
                          e.target.value,
                      })
                    }
                    placeholder="e.g. gloriahkitonga@gmail.com"
                    required
                  />

                  <label>
                    Phone Number
                  </label>

                  <input
                    type="tel"
                    value={
                      registerForm.phone
                    }
                    onChange={(e) =>
                      setRegisterForm({
                        ...registerForm,
                        phone:
                          e.target.value,
                      })
                    }
                    placeholder="e.g. 0712345678"
                  />

                  <label>
                    Department
                  </label>

                  <input
                    type="text"
                    value={
                      registerForm.department
                    }
                    onChange={(e) =>
                      setRegisterForm({
                        ...registerForm,
                        department:
                          e.target.value,
                      })
                    }
                    placeholder="e.g. ICT"
                  />

                  <label>
                    Position
                  </label>

                  <input
                    type="text"
                    value={
                      registerForm.position
                    }
                    onChange={(e) =>
                      setRegisterForm({
                        ...registerForm,
                        position:
                          e.target.value,
                      })
                    }
                    placeholder="e.g. ICT Officer"
                  />

                  {registrationError && (
                    <div className="error-message">
                      {registrationError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={
                      registrationLoading
                    }
                  >
                    {registrationLoading
                      ? 'Starting Registration...'
                      : 'Register'}
                  </button>

                  <button
                    type="button"
                    className="secondary-button full-button"
                    onClick={
                      cancelRegistration
                    }
                    disabled={
                      registrationLoading
                    }
                  >
                    Back to Sign In
                  </button>
                </form>
              )}

              {/* ==================================================
                  REGISTRATION OTP
              ================================================== */}

              {registrationStep === 'otp' && (
                <form
                  onSubmit={
                    verifyRegistrationOtp
                  }
                  className="employee-login"
                >
                  <h2>
                    Verify Your Email
                  </h2>

                  <p>
                    We sent a 6-digit
                    verification OTP to:
                  </p>

                  <strong>
                    {registerForm.email}
                  </strong>

                  <label>
                    Verification OTP
                  </label>

                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={
                      registrationOtp
                    }
                    onChange={(e) =>
                      setRegistrationOtp(
                        e.target.value
                          .replace(/\D/g, '')
                          .slice(0, 6),
                      )
                    }
                    placeholder="Enter 6-digit OTP"
                    required
                  />

                  {registrationError && (
                    <div className="error-message">
                      {registrationError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={
                      registrationLoading ||
                      registrationOtp.length !==
                        6
                    }
                  >
                    {registrationLoading
                      ? 'Verifying...'
                      : 'Verify Email'}
                  </button>

                  <button
                    type="button"
                    className="secondary-button full-button"
                    onClick={
                      cancelRegistration
                    }
                    disabled={
                      registrationLoading
                    }
                  >
                    Cancel Registration
                  </button>
                </form>
              )}

              {/* ==================================================
                  REGISTRATION PASSWORD
              ================================================== */}

              {registrationStep ===
                'password' && (
                <form
                  onSubmit={
                    completeRegistration
                  }
                  className="employee-login"
                >
                  <h2>
                    Create Your Password
                  </h2>

                  <p>
                    Your email has been
                    verified. Create a
                    password to complete your
                    employee account.
                  </p>

                  <label>
                    New Password
                  </label>

                  <input
                    type="password"
                    value={
                      registrationPassword
                    }
                    onChange={(e) =>
                      setRegistrationPassword(
                        e.target.value,
                      )
                    }
                    placeholder="Enter password"
                    required
                  />

                  <label>
                    Confirm Password
                  </label>

                  <input
                    type="password"
                    value={
                      registrationConfirmPassword
                    }
                    onChange={(e) =>
                      setRegistrationConfirmPassword(
                        e.target.value,
                      )
                    }
                    placeholder="Confirm password"
                    required
                  />

                  {registrationError && (
                    <div className="error-message">
                      {registrationError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={
                      registrationLoading
                    }
                  >
                    {registrationLoading
                      ? 'Creating Account...'
                      : 'Complete Registration'}
                  </button>

                  <button
                    type="button"
                    className="secondary-button full-button"
                    onClick={
                      cancelRegistration
                    }
                    disabled={
                      registrationLoading
                    }
                  >
                    Cancel
                  </button>
                </form>
              )}
            </>
          ) : !showEmployeeVerification ? (

            /* ==================================================
               NORMAL LOGIN
            ================================================== */

            <>
              <form
                onSubmit={login}
                className="employee-login"
              >
                <h2>
                  Government Employee Login
                </h2>

                <p>
                  Sign in with your
                  registered email and
                  password.
                </p>

                <label>
                  Email
                </label>

                <input
                  type="email"
                  value={
                    loginForm.email
                  }
                  onChange={(e) =>
                    setLoginForm({
                      ...loginForm,
                      email:
                        e.target.value,
                    })
                  }
                  placeholder="e.g. gloria@county.go.ke"
                  required
                />

                <label>
                  Password
                </label>

                <input
                  type="password"
                  value={
                    loginForm.password
                  }
                  onChange={(e) =>
                    setLoginForm({
                      ...loginForm,
                      password:
                        e.target.value,
                    })
                  }
                  placeholder="Enter your password"
                  required
                />

                {loginError && (
                  <div className="error-message">
                    {loginError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={
                    loginLoading
                  }
                >
                  {loginLoading
                    ? 'Signing in...'
                    : 'Sign In'}
                </button>
              </form>

              <div className="login-divider">
                or
              </div>

              {/* NEW REGISTRATION BUTTON */}

              <button
                type="button"
                className="secondary-button full-button"
                onClick={() => {
                  setShowRegistration(
                    true,
                  )

                  setShowEmployeeVerification(
                    false,
                  )

                  setLoginError('')
                  setRegistrationError('')
                }}
                disabled={loginLoading}
              >
                Create Employee Account
              </button>

              {/* EXISTING EMPLOYEE VERIFICATION */}

              <button
                type="button"
                className="secondary-button full-button"
                onClick={() => {
                  setShowEmployeeVerification(
                    true,
                  )

                  setLoginError('')
                  setOtp('')
                  setOtpSent(false)
                  setPasswordSetup(false)
                }}
                disabled={loginLoading}
              >
                First-time Government Employee Verification
              </button>

              <div className="login-info">
                <strong>
                  Access Control
                </strong>

                <p>
                  Your employee role
                  determines whether you can
                  manage records or have
                  view-only access.
                </p>
              </div>
            </>

          ) : (

            /* ==================================================
               EXISTING EMPLOYEE VERIFICATION
            ================================================== */

            <>
              {!otpSent &&
              !passwordSetup ? (
                <div className="employee-login">

                  <h2>
                    Government Employee
                    Verification
                  </h2>

                  <p>
                    Enter your registered
                    government employee email
                    to receive a 6-digit OTP.
                  </p>

                  <label>
                    Government Email
                  </label>

                  <input
                    type="email"
                    value={
                      loginForm.email
                    }
                    onChange={(e) =>
                      setLoginForm({
                        ...loginForm,
                        email:
                          e.target.value,
                      })
                    }
                    placeholder="e.g. gloria@county.go.ke"
                    required
                  />

                  {loginError && (
                    <div className="error-message">
                      {loginError}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={
                      sendEmployeeOtp
                    }
                    disabled={
                      loginLoading ||
                      !loginForm.email.trim()
                    }
                  >
                    {loginLoading
                      ? 'Sending OTP...'
                      : 'Send Verification OTP'}
                  </button>

                  <button
                    type="button"
                    className="secondary-button full-button"
                    onClick={() => {
                      setShowEmployeeVerification(
                        false,
                      )

                      setOtpSent(false)
                      setPasswordSetup(
                        false,
                      )

                      setOtp('')
                      setEmployeeId(null)
                      setLoginError('')
                    }}
                    disabled={
                      loginLoading
                    }
                  >
                    Back to Sign In
                  </button>
                </div>

              ) : passwordSetup ? (

                /* EXISTING EMPLOYEE PASSWORD */

                <form
                  className="employee-login"
                  onSubmit={
                    setEmployeePassword
                  }
                >
                  <h2>
                    Create Your Password
                  </h2>

                  <p>
                    Your email has been
                    verified. Create a
                    password for future
                    logins.
                  </p>

                  <label>
                    New Password
                  </label>

                  <input
                    type="password"
                    value={
                      newPassword
                    }
                    onChange={(e) =>
                      setNewPassword(
                        e.target.value,
                      )
                    }
                    placeholder="Enter password"
                    required
                  />

                  <label>
                    Confirm Password
                  </label>

                  <input
                    type="password"
                    value={
                      confirmPassword
                    }
                    onChange={(e) =>
                      setConfirmPassword(
                        e.target.value,
                      )
                    }
                    placeholder="Confirm password"
                    required
                  />

                  {passwordError && (
                    <div className="error-message">
                      {passwordError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={
                      passwordLoading
                    }
                  >
                    {passwordLoading
                      ? 'Saving Password...'
                      : 'Create Password'}
                  </button>
                </form>

              ) : (

                /* EXISTING EMPLOYEE OTP */

                <form
                  className="employee-login"
                  onSubmit={
                    verifyEmployeeOtp
                  }
                >
                  <h2>
                    Verify Your Email
                  </h2>

                  <p>
                    A 6-digit OTP has been
                    sent to your registered
                    government email.
                  </p>

                  <label>
                    Verification OTP
                  </label>

                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) =>
                      setOtp(
                        e.target.value
                          .replace(/\D/g, '')
                          .slice(0, 6),
                      )
                    }
                    placeholder="Enter 6-digit OTP"
                    required
                  />

                  {loginError && (
                    <div className="error-message">
                      {loginError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={
                      loginLoading ||
                      otp.length !== 6
                    }
                  >
                    {loginLoading
                      ? 'Verifying...'
                      : 'Verify & Continue'}
                  </button>

                  <button
                    type="button"
                    className="secondary-button full-button"
                    onClick={() => {
                      setShowEmployeeVerification(
                        false,
                      )

                      setOtpSent(false)
                      setOtp('')
                      setEmployeeId(null)
                      setLoginError('')
                    }}
                    disabled={
                      loginLoading
                    }
                  >
                    Back to Sign In
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    )
  }

  // ============================================================
  // AUTHENTICATED APPLICATION
  // ============================================================

  return (
    <div className="app">

      {/* ======================================================
          TOP BAR
      ====================================================== */}

      <header className="topbar">

        <button
          className="menu-button"
          onClick={() => {
            setMenuOpen(!menuOpen)
            setProfileOpen(false)
          }}
          aria-label="Open menu"
        >
          ☰
        </button>

        <div className="brand">

          <div className="brand-logo">
            TT
          </div>

          <div>
            <strong>
              Taita Taveta County
            </strong>

            <span>
              Events & Meetings Management
            </span>
          </div>

        </div>
<div className="topbar-profile">

  <button
    type="button"
    className="profile-trigger"
    onClick={() => setProfileOpen((current) => !current)}
    aria-expanded={profileOpen}
    aria-label="Open profile menu"
  >
    <span className="profile-avatar">
      {user.name.charAt(0).toUpperCase()}
    </span>

    <span className="topbar-user-info">
      <strong>{user.name}</strong>
      <small>{user.role.replaceAll('_', ' ')}</small>
    </span>

    <span className="profile-chevron">
      {profileOpen ? '▲' : '▼'}
    </span>
  </button>

  {profileOpen && (
    <div className="profile-dropdown">
      <div className="profile-dropdown-header">
        <span className="profile-avatar large">
          {user.name.charAt(0).toUpperCase()}
        </span>
        <div>
          <strong>{user.name}</strong>
          <span>{user.email}</span>
        </div>
      </div>

      <button
        type="button"
        className="profile-menu-item"
        onClick={() => navigate('account')}
      >
        <span>👤</span>
        <span>
          <strong>My Account</strong>
          <small>View profile and permissions</small>
        </span>
      </button>

      <div className="profile-divider" />

      <button
        type="button"
        className="profile-menu-item logout-item"
        onClick={logout}
      >
        <span>↪</span>
        <span>
          <strong>Sign Out</strong>
          <small>End your current session</small>
        </span>
      </button>
    </div>
  )}

</div>

      </header>

      {/* ======================================================
          SIDEBAR
      ====================================================== */}

      <aside
        className={`sidebar ${
          menuOpen ? 'open' : ''
        }`}
      >

        <nav>

          <button
            className={
              page === 'dashboard'
                ? 'active'
                : ''
            }
            onClick={() =>
              navigate('dashboard')
            }
          >
            <span className="nav-label"><span className="nav-icon">▦</span>Dashboard</span>
          </button>

          <button
            className={
              page === 'events' ||
              page === 'create-event'
                ? 'active'
                : ''
            }
            onClick={() =>
              navigate('events')
            }
          >
            <span className="nav-label"><span className="nav-icon">◆</span>Events</span>
            <span className="nav-count">{events.length}</span>
          </button>

          <button
            className={
              page === 'meetings' ||
              page === 'create-meeting'
                ? 'active'
                : ''
            }
            onClick={() =>
              navigate('meetings')
            }
          >
            <span className="nav-label"><span className="nav-icon">▣</span>Meetings</span>
            <span className="nav-count">{meetings.length}</span>
          </button>

          <button
            className={
              page === 'attendance'
                ? 'active'
                : ''
            }
            onClick={() =>
              navigate('attendance')
            }
          >
            <span className="nav-label"><span className="nav-icon">✓</span>Attendance</span>
            <span className="nav-count">{attendance.length}</span>
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
            <span className="nav-label"><span className="nav-icon">●</span>Notifications</span>
          </button>

          <button
            className={
              page === 'reports'
                ? 'active'
                : ''
            }
            onClick={() =>
              navigate('reports')
            }
          >
            <span className="nav-label"><span className="nav-icon">▤</span>Reports</span>
          </button>

          <button
            className={
              page === 'account'
                ? 'active'
                : ''
            }
            onClick={() =>
              navigate('account')
            }
          >
            <span className="nav-label"><span className="nav-icon">◉</span>My Account</span>
          </button>

        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user-summary">
            <span className="profile-avatar">
              {user.name.charAt(0).toUpperCase()}
            </span>
            <div>
              <strong>{user.name}</strong>
              <small>
                {user.department ?? 'County Government'}
              </small>
            </div>
          </div>

          <button
            type="button"
            className="sidebar-account-button"
            onClick={() => navigate('account')}
          >
            <span>👤</span>
            My Account
          </button>

          <small className="sidebar-security-note">
            Sign out is available from your profile menu.
          </small>
        </div>
      </aside>

      {/* ======================================================
          MAIN CONTENT
      ====================================================== */}

      <main className="main-content">

        {loading && (
          <div className="loading-bar">
            Loading system data...
          </div>
        )}

        {/* ====================================================
            DASHBOARD
        ==================================================== */}

        {page === 'dashboard' && (
          <section>

            <div className="page-heading">

              <div>

                <p className="eyebrow">
                  County Portal
                </p>

                <h1>
                  Welcome, {user.name}
                </h1>

                <p>
                  Manage and view county
                  events, meetings,
                  attendance and
                  notifications from one
                  place.
                </p>

              </div>

              <div className="role-badge">
                Access:{' '}
                <strong>
                  {user.role}
                </strong>
              </div>

            </div>

            <div className="stats-grid">

              <div className="stat-card">
                <span>
                  Events
                </span>

                <strong>
                  {events.length}
                </strong>
              </div>

              <div className="stat-card">
                <span>
                  Meetings
                </span>

                <strong>
                  {meetings.length}
                </strong>
              </div>

              <div className="stat-card">
                <span>
                  Present
                </span>

                <strong>
                  {presentCount}
                </strong>
              </div>

              <div className="stat-card">
                <span>
                  Absent
                </span>

                <strong>
                  {absentCount}
                </strong>
              </div>

            </div>

            <div className="dashboard-grid">

              <div className="panel">

                <div className="panel-heading">
                  <h2>
                    Quick Actions
                  </h2>
                </div>

                <div className="quick-actions button-grid">

                  <button
                    onClick={() =>
                      navigate('events')
                    }
                  >
                    View Events
                  </button>

                  <button
                    onClick={() =>
                      navigate('meetings')
                    }
                  >
                    View Meetings
                  </button>

                  <button
                    onClick={() =>
                      navigate(
                        'attendance',
                      )
                    }
                  >
                    View Attendance
                  </button>

                  <button
                    onClick={() =>
                      navigate(
                        'reports',
                      )
                    }
                  >
                    View Reports
                  </button>

                </div>
              </div>

              <div className="panel">

                <div className="panel-heading">
                  <h2>
                    System Access
                  </h2>
                </div>

                <p>
                  <strong>
                    {user.name}
                  </strong>{' '}
                  is signed in as{' '}
                  <strong>
                    {user.role}
                  </strong>.
                </p>

                <p>
                  {canManageMeetings
                    ? 'Your permissions allow you to manage authorised meetings and related records.'
                    : 'Your account has view-focused access to the functions assigned to your role.'}
                </p>

              </div>

            </div>

            <div className="panel">

              <div className="panel-heading">

                <h2>
                  Recent Events
                </h2>

                <button
                  onClick={() =>
                    navigate('events')
                  }
                >
                  View all
                </button>

              </div>

              {events.length === 0 ? (
                <p className="empty-state">
                  No events have been
                  created yet.
                </p>
              ) : (
                <div className="table-wrapper">

                  <table>

                    <thead>
                      <tr>
                        <th>
                          Event
                        </th>
                        <th>
                          Date
                        </th>
                        <th>
                          Time
                        </th>
                        <th>
                          Venue
                        </th>
                      </tr>
                    </thead>

                    <tbody>

                      {events
                        .slice(0, 5)
                        .map((event) => (
                          <tr
                            key={
                              event.id ??
                              `${event.name}-${event.date}`
                            }
                          >
                            <td>
                              {event.name}
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
                          </tr>
                        ))}

                    </tbody>

                  </table>

                </div>
              )}

            </div>

          </section>
        )}

        {/* ====================================================
            EVENTS
        ==================================================== */}

        {page === 'events' && (
          <section>

            <div className="page-heading">

              <div>

                <p className="eyebrow">
                  Management
                </p>

                <h1>
                  Events
                </h1>

                <p>
                  View county events and
                  their schedules.
                </p>

              </div>

              {can(
                'meetings.create',
              ) && (
                <div className="page-heading-actions">
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        'create-event',
                      )
                    }
                  >
                    + Create Event
                  </button>
                </div>
              )}

            </div>

            <div className="panel">

              {events.length === 0 ? (
                <p className="empty-state">
                  No events available.
                </p>
              ) : (
                <div className="table-wrapper">

                  <table>

                    <thead>

                      <tr>

                        <th>
                          Name
                        </th>

                        <th>
                          Date
                        </th>

                        <th>
                          Time
                        </th>

                        <th>
                          Venue
                        </th>

                        {can(
                          'meetings.update',
                        ) && (
                          <th>
                            Actions
                          </th>
                        )}

                      </tr>

                    </thead>

                    <tbody>

                      {events.map(
                        (event) => (
                          <tr
                            key={
                              event.id ??
                              `${event.name}-${event.date}`
                            }
                          >

                            <td>

                              <strong>
                                {event.name}
                              </strong>

                              {event.description && (
                                <small>
                                  {
                                    event.description
                                  }
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

                            {can(
                              'meetings.update',
                            ) && (
                              <td className="actions"><div className="table-action-buttons">

                                <button
                                  onClick={() =>
                                    editEvent(
                                      event,
                                    )
                                  }
                                >
                                  Edit
                                </button>

                                <button
                                  className="danger"
                                  onClick={() =>
                                    deleteEvent(
                                      event.id,
                                    )
                                  }
                                >
                                  Delete
                                </button>

                              </div></td>
                            )}

                          </tr>
                        ),
                      )}

                    </tbody>

                  </table>

                </div>
              )}

            </div>

          </section>
        )}

        {/* ====================================================
            CREATE EVENT
        ==================================================== */}

        {page ===
          'create-event' &&
          can('meetings.create') && (
            <section>

              <div className="page-heading">

                <div>

                  <p className="eyebrow">
                    Administrator
                  </p>

                  <h1>
                    Create Event
                  </h1>

                  <p>
                    Add a new county event.
                  </p>

                </div>

              </div>

              <form
                className="form-panel"
                onSubmit={createEvent}
              >

                <label>
                  Event Name
                </label>

                <input
                  value={
                    eventForm.name
                  }
                  onChange={(e) =>
                    setEventForm({
                      ...eventForm,
                      name:
                        e.target.value,
                    })
                  }
                  placeholder="Event name"
                  required
                />

                <div className="form-grid">

                  <div>

                    <label>
                      Date
                    </label>

                    <input
                      type="date"
                      value={
                        eventForm.date
                      }
                      onChange={(e) =>
                        setEventForm({
                          ...eventForm,
                          date:
                            e.target.value,
                        })
                      }
                      required
                    />

                  </div>

                  <div>

                    <label>
                      Time
                    </label>

                    <input
                      type="time"
                      value={
                        eventForm.time
                      }
                      onChange={(e) =>
                        setEventForm({
                          ...eventForm,
                          time:
                            e.target.value,
                        })
                      }
                      required
                    />

                  </div>

                </div>

                <label>
                  Venue
                </label>

                <input
                  value={
                    eventForm.venue
                  }
                  onChange={(e) =>
                    setEventForm({
                      ...eventForm,
                      venue:
                        e.target.value,
                    })
                  }
                  placeholder="Venue"
                  required
                />

                <label>
                  Description
                </label>

                <textarea
                  value={
                    eventForm.description
                  }
                  onChange={(e) =>
                    setEventForm({
                      ...eventForm,
                      description:
                        e.target.value,
                    })
                  }
                  placeholder="Event description"
                  rows={4}
                />

                <div className="form-actions">

                  <button type="submit">
                    Create Event
                  </button>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() =>
                      navigate(
                        'events',
                      )
                    }
                  >
                    Cancel
                  </button>

                </div>

              </form>

            </section>
          )}

        {/* ====================================================
            MEETINGS
        ==================================================== */}

        {page === 'meetings' && (
          <section>

            <div className="page-heading">

              <div>

                <p className="eyebrow">
                  Management
                </p>

                <h1>
                  Meetings
                </h1>

                <p>
                  View scheduled county
                  meetings.
                </p>

              </div>

              {can(
                'meetings.create',
              ) && (
                <div className="page-heading-actions">
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        'create-meeting',
                      )
                    }
                  >
                    + Create Meeting
                  </button>
                </div>
              )}

            </div>

            <div className="panel">

              {meetings.length === 0 ? (
                <p className="empty-state">
                  No meetings available.
                </p>
              ) : (
                <div className="table-wrapper">

                  <table>

                    <thead>

                      <tr>

                        <th>
                          Meeting
                        </th>

                        <th>
                          Date
                        </th>

                        <th>
                          Time
                        </th>

                        <th>
                          Venue
                        </th>

                        {can(
                          'meetings.update',
                        ) && (
                          <th>
                            Actions
                          </th>
                        )}

                      </tr>

                    </thead>

                    <tbody>

                      {meetings.map(
                        (meeting) => (
                          <tr
                            key={
                              meeting.id ??
                              `${meeting.title}-${meeting.date}-${meeting.time}`
                            }
                          >

                            <td>

                              <strong>
                                {
                                  meeting.title
                                }
                              </strong>

                              {meeting.description && (
                                <small>
                                  {
                                    meeting.description
                                  }
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

                            {can(
                              'meetings.update',
                            ) && (
                              <td className="actions"><div className="table-action-buttons">

                                <button
                                  onClick={() =>
                                    editMeeting(
                                      meeting,
                                    )
                                  }
                                >
                                  Edit
                                </button>

                                <button
                                  className="danger"
                                  onClick={() =>
                                    deleteMeeting(
                                      meeting.id,
                                    )
                                  }
                                >
                                  Delete
                                </button>

                              </div></td>
                            )}

                          </tr>
                        ),
                      )}

                    </tbody>

                  </table>

                </div>
              )}

            </div>

          </section>
        )}

        {/* ====================================================
            CREATE MEETING
        ==================================================== */}

        {page ===
          'create-meeting' &&
          can('meetings.create') && (
            <section>

              <div className="page-heading">

                <div>

                  <p className="eyebrow">
                    Administrator
                  </p>

                  <h1>
                    Create Meeting
                  </h1>

                  <p>
                    Schedule a new county
                    meeting.
                  </p>

                </div>

              </div>

              <form
                className="form-panel"
                onSubmit={createMeeting}
              >

                <label>
                  Meeting Title
                </label>

                <input
                  value={
                    meetingForm.title
                  }
                  onChange={(e) =>
                    setMeetingForm({
                      ...meetingForm,
                      title:
                        e.target.value,
                    })
                  }
                  placeholder="Meeting title"
                  required
                />

                <div className="form-grid">

                  <div>

                    <label>
                      Date
                    </label>

                    <input
                      type="date"
                      value={
                        meetingForm.date
                      }
                      onChange={(e) =>
                        setMeetingForm({
                          ...meetingForm,
                          date:
                            e.target.value,
                        })
                      }
                      required
                    />

                  </div>

                  <div>

                    <label>
                      Time
                    </label>

                    <input
                      type="time"
                      value={
                        meetingForm.time
                      }
                      onChange={(e) =>
                        setMeetingForm({
                          ...meetingForm,
                          time:
                            e.target.value,
                        })
                      }
                      required
                    />

                  </div>

                </div>

                <label>
                  Venue
                </label>

                <input
                  value={
                    meetingForm.venue
                  }
                  onChange={(e) =>
                    setMeetingForm({
                      ...meetingForm,
                      venue:
                        e.target.value,
                    })
                  }
                  placeholder="Meeting venue"
                  required
                />

                <label>
                  Description
                </label>

                <textarea
                  value={
                    meetingForm.description
                  }
                  onChange={(e) =>
                    setMeetingForm({
                      ...meetingForm,
                      description:
                        e.target.value,
                    })
                  }
                  placeholder="Meeting description"
                  rows={4}
                />

                <div className="form-actions">

                  <button type="submit">
                    Create Meeting
                  </button>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() =>
                      navigate(
                        'meetings',
                      )
                    }
                  >
                    Cancel
                  </button>

                </div>

              </form>

            </section>
          )}

        {/* ====================================================
            ATTENDANCE
        ==================================================== */}

        {page === 'attendance' && (
          <section>

            <div className="page-heading">

              <div>

                <p className="eyebrow">
                  Records
                </p>

                <h1>
                  Attendance
                </h1>

                <p>
                  View meeting attendance
                  records.
                </p>

              </div>

            </div>

            {can(
              'attendance.capture',
            ) && (
              <form
                className="form-panel"
                onSubmit={
                  recordAttendance
                }
              >

                <h2>
                  Record Attendance
                </h2>

                <label>
                  Meeting
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
                    Select a meeting
                  </option>

                  {meetings.map(
                    (meeting) => (
                      <option
                        key={meeting.id}
                        value={meeting.id}
                      >
                        {meeting.title} —{' '}
                        {meeting.date}
                      </option>
                    ),
                  )}

                </select>

                <label>
                  Attendee Name
                </label>

                <input
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
                  placeholder="Attendee name"
                  required
                />

                <label>
                  Status
                </label>

                <select
                  value={
                    attendanceForm.status
                  }
                  onChange={(e) =>
                    setAttendanceForm({
                      ...attendanceForm,
                      status:
                        e.target.value as
                          | 'present'
                          | 'absent',
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

                <button type="submit">
                  Record Attendance
                </button>

              </form>
            )}

            <div className="stats-grid">

              <div className="stat-card">

                <span>
                  Total Records
                </span>

                <strong>
                  {attendance.length}
                </strong>

              </div>

              <div className="stat-card">

                <span>
                  Present
                </span>

                <strong>
                  {presentCount}
                </strong>

              </div>

              <div className="stat-card">

                <span>
                  Absent
                </span>

                <strong>
                  {absentCount}
                </strong>

              </div>

            </div>

            <div className="panel">

              {attendance.length === 0 ? (
                <p className="empty-state">
                  No attendance records
                  available.
                </p>
              ) : (
                <div className="table-wrapper">

                  <table>

                    <thead>

                      <tr>

                        <th>
                          Meeting
                        </th>

                        <th>
                          Attendee
                        </th>

                        <th>
                          Status
                        </th>

                        {can(
                          'attendance.correct',
                        ) && (
                          <th>
                            Actions
                          </th>
                        )}

                      </tr>

                    </thead>

                    <tbody>

                      {attendance.map(
                        (record) => {

                          const meeting =
                            meetings.find(
                              (item) =>
                                item.id ===
                                record.meeting_id,
                            )

                          return (
                            <tr
                              key={
                                record.id ??
                                `${record.meeting_id}-${record.attendee_name}`
                              }
                            >

                              <td>
                                {record.meeting
                                  ?.title ??
                                  meeting?.title ??
                                  `Meeting #${record.meeting_id}`}
                              </td>

                              <td>
                                {
                                  record.attendee_name
                                }
                              </td>

                              <td>

                                <span
                                  className={`status ${record.status}`}
                                >
                                  {
                                    record.status
                                  }
                                </span>

                              </td>

                              {can(
                                'attendance.correct',
                              ) && (
                                <td className="actions"><div className="table-action-buttons">

                                  <button
                                    onClick={() =>
                                      editAttendance(
                                        record,
                                      )
                                    }
                                  >
                                    Edit
                                  </button>

                                  <button
                                    className="danger"
                                    onClick={() =>
                                      deleteAttendance(
                                        record.id,
                                      )
                                    }
                                  >
                                    Delete
                                  </button>

                                </div></td>
                              )}

                            </tr>
                          )
                        },
                      )}

                    </tbody>

                  </table>

                </div>
              )}

            </div>

          </section>
        )}

        {/* ====================================================
            NOTIFICATIONS
        ==================================================== */}

        {page ===
          'notifications' && (
          <section>

            <div className="page-heading">

              <div>

                <p className="eyebrow">
                  Information
                </p>

                <h1>
                  Notifications
                </h1>

                <p>
                  Important system and
                  meeting notifications.
                </p>

              </div>

            </div>

            <div className="notification-list">

              <div className="notification-card">

                <strong>
                  Meeting updates
                </strong>

                <p>
                  Check the Meetings
                  section regularly for
                  the latest county meeting
                  schedules.
                </p>

              </div>

              <div className="notification-card">

                <strong>
                  Attendance
                </strong>

                <p>
                  Attendance records are
                  available to authorized
                  users through the
                  Attendance section.
                </p>

              </div>

              <div className="notification-card">

                <strong>
                  Access control
                </strong>

                <p>
                  Administrator permissions
                  are required to create,
                  edit or delete records.
                </p>

              </div>

              <div className="notification-card">

                <strong>
                  Employee verification
                </strong>

                <p>
                  Government employees can
                  verify their registered
                  email using a six-digit
                  OTP.
                </p>

              </div>

            </div>

          </section>
        )}

        {/* ====================================================
            ACCOUNT
        ==================================================== */}

        {page === 'account' && (
          <section>

            <div className="page-heading">

              <div>

                <p className="eyebrow">
                  Profile
                </p>

                <h1>
                  My Account
                </h1>

                <p>
                  View your county employee
                  account and access level.
                </p>

              </div>

            </div>

            <div className="dashboard-grid">

              <div className="panel">

                <div className="panel-heading">
                  <h2>
                    Personal Information
                  </h2>
                </div>

                <div className="profile-details">

                  <div>
                    <span>
                      Name
                    </span>

                    <strong>
                      {user.name}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Email
                    </span>

                    <strong>
                      {user.email}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Department
                    </span>

                    <strong>
                      {user.department ??
                        'Not assigned'}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Position
                    </span>

                    <strong>
                      {user.position ??
                        'Not assigned'}
                    </strong>
                  </div>

                </div>

              </div>

              <div className="panel">

                <div className="panel-heading">
                  <h2>
                    Access & Permissions
                  </h2>
                </div>

                <p>
                  <strong>
                    Role:
                  </strong>{' '}
                  {user.role.replaceAll(
                    '_',
                    ' ',
                  )}
                </p>

                <ul className="permission-list">

                  {(
                    user.permissions ??
                    rolePermissions[
                      user.role
                    ] ??
                    []
                  ).map(
                    (permission) => (
                      <li
                        key={
                          permission
                        }
                      >
                        {permission}
                      </li>
                    ),
                  )}

                </ul>

              </div>

            </div>

          </section>
        )}

        {/* ====================================================
            REPORTS
        ==================================================== */}

        {page === 'reports' && (
          <section>

            <div className="page-heading">

              <div>

                <p className="eyebrow">
                  Overview
                </p>

                <h1>
                  Reports
                </h1>

                <p>
                  Summary of county events,
                  meetings and attendance.
                </p>

              </div>

            </div>

            <div className="stats-grid">

              <div className="stat-card">

                <span>
                  Total Events
                </span>

                <strong>
                  {events.length}
                </strong>

              </div>

              <div className="stat-card">

                <span>
                  Total Meetings
                </span>

                <strong>
                  {meetings.length}
                </strong>

              </div>

              <div className="stat-card">

                <span>
                  Present
                </span>

                <strong>
                  {presentCount}
                </strong>

              </div>

              <div className="stat-card">

                <span>
                  Absent
                </span>

                <strong>
                  {absentCount}
                </strong>

              </div>

            </div>

            <div className="panel">

              <div className="panel-heading">

                <h2>
                  Attendance Report
                </h2>

              </div>

              {attendance.length === 0 ? (
                <p className="empty-state">
                  No attendance data
                  available.
                </p>
              ) : (
                <div className="table-wrapper">

                  <table>

                    <thead>

                      <tr>

                        <th>
                          Meeting
                        </th>

                        <th>
                          Attendee
                        </th>

                        <th>
                          Status
                        </th>

                      </tr>

                    </thead>

                    <tbody>

                      {attendance.map(
                        (record) => {

                          const meeting =
                            meetings.find(
                              (item) =>
                                item.id ===
                                record.meeting_id,
                            )

                          return (
                            <tr
                              key={
                                record.id ??
                                `${record.meeting_id}-${record.attendee_name}`
                              }
                            >

                              <td>
                                {record.meeting
                                  ?.title ??
                                  meeting?.title ??
                                  `Meeting #${record.meeting_id}`}
                              </td>

                              <td>
                                {
                                  record.attendee_name
                                }
                              </td>

                              <td>
                                {
                                  record.status
                                }
                              </td>

                            </tr>
                          )
                        },
                      )}

                    </tbody>

                  </table>

                </div>
              )}

            </div>

            <div className="panel">

              <div className="panel-heading">

                <h2>
                  Meetings Report
                </h2>

              </div>

              {meetings.length === 0 ? (
                <p className="empty-state">
                  No meetings available.
                </p>
              ) : (
                <div className="table-wrapper">

                  <table>

                    <thead>

                      <tr>

                        <th>
                          Meeting
                        </th>

                        <th>
                          Date
                        </th>

                        <th>
                          Time
                        </th>

                        <th>
                          Venue
                        </th>

                      </tr>

                    </thead>

                    <tbody>

                      {meetings.map(
                        (meeting) => (
                          <tr
                            key={
                              meeting.id ??
                              `${meeting.title}-${meeting.date}`
                            }
                          >

                            <td>
                              {
                                meeting.title
                              }
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
                        ),
                      )}

                    </tbody>

                  </table>

                </div>
              )}

            </div>

          </section>
        )}

      </main>

      {/* ======================================================
          FOOTER
      ====================================================== */}

      <footer className="footer">
        Taita Taveta County Events &
        Meetings Management System
      </footer>

    </div>
  )
}

export default App
