import { useEffect, useState, useRef } from 'react'
import { getAllVisitorData, getRecentVisitorData, getVisitorStats } from './utils/firebase.js'
import './AdminPanel.css'

function AdminPanel() {
  const [ipAddresses, setIpAddresses] = useState([])
  const [stats, setStats] = useState({ total: 0, unique: 0 })
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [error, setError] = useState(null)
  const [selectedIP, setSelectedIP] = useState(null)
  const [showPastData, setShowPastData] = useState(false) // false = last 30 min, true = all data
  const errorRef = useRef(null) // Use ref to track error without causing re-renders

  const fetchIPs = async (fetchAll = false) => {
    try {
      setError(null)
      
      // Debug logging
      console.log('🔍 Admin Panel - Fetching data from Firebase (serverless)')
      console.log('🔍 Fetch mode:', fetchAll ? 'ALL historical data' : 'Last 30 minutes')
      
      // Fetch data directly from Firebase
      const [ipsData, statsData] = await Promise.all([
        fetchAll ? getAllVisitorData() : getRecentVisitorData(30),
        getVisitorStats()
      ])
      
      console.log('✅ Admin Panel - Received IPs from Firebase:', ipsData.length)
      console.log('✅ Admin Panel - Received stats from Firebase:', statsData)
      
      setIpAddresses(Array.isArray(ipsData) ? ipsData : [])
      setStats(statsData || { total: 0, unique: 0 })
      setError(null) // Clear any previous errors on success
      errorRef.current = null // Clear ref
      setLoading(false)
    } catch (error) {
      console.error('❌ Failed to fetch IPs from Firebase:', error)
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack
      })
      
      let errorMessage = `Failed to fetch data from Firebase: ${error.message}`
      
      if (error.message.includes('Firebase not initialized')) {
        errorMessage = `Firebase is not initialized. Please check your Firebase configuration and make sure the environment variables are set correctly.`
      } else if (error.message.includes('permission-denied') || error.message.includes('Permission denied')) {
        errorMessage = `Firebase permission denied. Please check your Firestore security rules to allow read access.`
      } else if (error.message.includes('index')) {
        errorMessage = `Firestore index missing. Please create the required index in Firebase Console. Check the browser console for the index creation link.`
      }
      
      setError(errorMessage)
      errorRef.current = errorMessage // Update ref
      setLoading(false)
    }
  }
  

  useEffect(() => {
    // Initial fetch
    fetchIPs(showPastData)
  }, [showPastData]) // Only refetch when showPastData changes

  // Separate effect for auto-refresh (use ref to avoid loop)
  useEffect(() => {
    if (!autoRefresh) {
      return // Don't set up interval if auto-refresh is off
    }
    
    const interval = setInterval(() => {
      // Check error ref (not state) to avoid re-renders
      if (!errorRef.current) {
        fetchIPs(showPastData)
      }
    }, 5000) // Refresh every 5 seconds
    
    return () => clearInterval(interval)
  }, [autoRefresh, showPastData]) // Don't include error to prevent loop
  
  // Handle past data button click
  const handlePastDataToggle = () => {
    setShowPastData(!showPastData)
    setLoading(true)
    fetchIPs(!showPastData)
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  const formatTimeOnSite = (entryTime) => {
    if (!entryTime) return 'Unknown'
    const now = Date.now()
    const entry = typeof entryTime === 'string' ? new Date(entryTime).getTime() : entryTime
    const seconds = Math.floor((now - entry) / 1000)
    
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ${minutes % 60}m`
  }

  const formatReferrer = (referrer) => {
    if (!referrer || referrer === 'Direct Visit') return 'Direct Visit'
    try {
      const url = new URL(referrer)
      return url.hostname || referrer
    } catch {
      return referrer
    }
  }

  const getIPVisits = (ip) => {
    return ipAddresses.filter(item => item.ip === ip)
  }

  const getUniqueIPs = () => {
    const unique = new Set(ipAddresses.map(item => item.ip))
    return Array.from(unique)
  }

  const groupByIP = () => {
    const grouped = {}
    ipAddresses.forEach(item => {
      // Group by public IP if available, otherwise by server IP
      const groupKey = item.publicIP || item.ip
      if (!grouped[groupKey]) {
        grouped[groupKey] = []
      }
      grouped[groupKey].push(item)
    })
    return grouped
  }

  return (
    <div className="admin-panel">
      <header className="admin-header">
        <div className="container">
          <h1>...A bug is never just a mistake. it represent something bigger. an error of thinking that makes you who you are ...- DuckyBucky -</h1>
          <div className="admin-controls">
            <button 
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`btn-toggle ${autoRefresh ? 'active' : ''}`}
            >
              {autoRefresh ? '[PAUSE]' : '[RESUME]'} SCAN
            </button>
            <button 
              onClick={() => fetchIPs(showPastData)} 
              className="btn-refresh"
            >
              [REFRESH] DATA
            </button>
            <button 
              onClick={handlePastDataToggle}
              className={`btn-past-data ${showPastData ? 'active' : ''}`}
            >
              {showPastData ? '[CURRENT]' : '[PAST DATA]'}
            </button>
          </div>
        </div>
      </header>

      <main className="admin-content">
        <div className="container">
          {/* Statistics Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">[TOTAL]</div>
              <div className="stat-info">
                <h3>Total Visits</h3>
                <p className="stat-value">{stats.total}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">[UNIQUE]</div>
              <div className="stat-info">
                <h3>Unique Visitors</h3>
                <p className="stat-value">{stats.unique}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">[ACTIVE]</div>
              <div className="stat-info">
                <h3>{showPastData ? 'All Time Records' : 'Last 30 Minutes'}</h3>
                <p className="stat-value">{ipAddresses.length}</p>
              </div>
            </div>
          </div>

          {/* Visitor Details */}
          <div className="visitors-container">
            <h2>&gt; VISITOR DATABASE</h2>
            {error ? (
              <div className="error-message">
                <p>⚠️ {error}</p>
                <p style={{ fontSize: '0.9rem', marginTop: '0.5rem', opacity: 0.8 }}>
                  This is a serverless application using Firebase. Make sure Firebase is configured correctly and Firestore security rules allow read access.
                </p>
              </div>
            ) : loading ? (
              <div className="loading">
                <div>&gt; SCANNING NETWORK...</div>
                <div>&gt; ACCESSING DATABASE...</div>
                <div>&gt; LOADING VISITOR DATA...</div>
              </div>
            ) : ipAddresses.length === 0 ? (
              <div className="no-data">
                <div>&gt; NO TARGETS DETECTED</div>
                <div style={{ fontSize: '0.9rem', marginTop: '1rem', opacity: 0.8 }}>
                  &gt; Visit main website at <span style={{ color: '#00ffff', textShadow: '0 0 5px #00ffff' }}>http://localhost:3000</span> to start tracking
                </div>
              </div>
            ) : (
              <div className="visitors-grid">
                {Object.entries(groupByIP()).map(([ip, visits]) => {
                  const latestVisit = visits[visits.length - 1]
                  const deviceInfo = latestVisit.deviceInfo || {}
                  const location = latestVisit.location || {}
                  const network = latestVisit.network || {}
                  
                  return (
                    <div key={ip} className="visitor-card">
                      <div className="visitor-header">
                        <div className="visitor-ip-section">
                          <div className="ip-display">
                            <span className="ip-label">[UNIQUE VISITOR ID]</span>
                            <span className="visitor-id">{latestVisit.uniqueVisitorID || 'N/A'}</span>
                          </div>
                          <div className="ip-display">
                            <span className="ip-label">[PUBLIC IP]</span>
                            <span className="visitor-ip">{latestVisit.publicIP || ip}</span>
                          </div>
                          {latestVisit.publicIP && latestVisit.publicIP !== ip && (
                            <div className="ip-display">
                              <span className="ip-label">[SERVER IP]</span>
                              <span className="server-ip">{ip}</span>
                            </div>
                          )}
                          <span className="visit-badge">[VISITS: {visits.length}]</span>
                        </div>
                        {(network.isVPN || network.isProxy) && (
                          <div className="security-badges">
                            {network.isVPN && <span className="badge-vpn">[VPN DETECTED]</span>}
                            {network.isProxy && <span className="badge-proxy">[PROXY DETECTED]</span>}
                          </div>
                        )}
                      </div>

                      <div className="visitor-details">
                        {/* Location Info */}
                        <div className="detail-section">
                          <h4>[LOCATION]</h4>
                          <div className="detail-grid">
                            <div className="detail-item">
                              <span className="detail-label">Country:</span>
                              <span className="detail-value">{location.country || 'Unknown'}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">City:</span>
                              <span className="detail-value">{location.city || 'Unknown'}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Region:</span>
                              <span className="detail-value">{location.region || 'Unknown'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Network Info */}
                        <div className="detail-section">
                          <h4>[NETWORK]</h4>
                          <div className="detail-grid">
                            <div className="detail-item">
                              <span className="detail-label">ISP:</span>
                              <span className="detail-value">{network.isp || 'Unknown'}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Organization:</span>
                              <span className="detail-value">{network.organization || 'Unknown'}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">ASN:</span>
                              <span className="detail-value">{network.asn || 'Unknown'}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Connection Type:</span>
                              <span className="detail-value">{deviceInfo.connectionType || 'Unknown'}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Ethernet:</span>
                              <span className={`detail-value ${deviceInfo.isEthernet ? 'ethernet-active' : 'ethernet-inactive'}`}>
                                {deviceInfo.isEthernet ? '[USING ETHERNET]' : '[NOT ETHERNET]'}
                              </span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Downlink Speed:</span>
                              <span className="detail-value downlink-speed">
                                {deviceInfo.downlinkSpeed || deviceInfo.connectionDownlink ? 
                                  (deviceInfo.downlinkSpeed || `${deviceInfo.connectionDownlink} Mbps`) : 
                                  'Unknown'}
                              </span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Connection Quality:</span>
                              <span className="detail-value">
                                {deviceInfo.connectionEffectiveType || 'Unknown'}
                              </span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">VPN Status:</span>
                              <span className={`detail-value ${network.isVPN ? 'vpn-detected' : 'vpn-clean'}`}>
                                {network.isVPN ? '[VPN DETECTED]' : '[NO VPN]'}
                              </span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Proxy Status:</span>
                              <span className={`detail-value ${network.isProxy ? 'proxy-detected' : 'proxy-clean'}`}>
                                {network.isProxy ? '[PROXY DETECTED]' : '[NO PROXY]'}
                              </span>
                            </div>
                            {network.fakeIPIndicators && network.fakeIPIndicators.length > 0 && (
                              <div className="detail-item full-width">
                                <span className="detail-label fake-ip-label">🚨 Fake IP Indicators:</span>
                                <div className="fake-ip-indicators">
                                  {network.fakeIPIndicators.map((indicator, idx) => (
                                    <div key={idx} className="fake-ip-indicator">
                                      ⚠️ {indicator}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* WebRTC IP Leak Detection */}
                        <div className="detail-section webrtc-section">
                          <h4>[WEBRTC IP LEAK DETECTION]</h4>
                          <div className="webrtc-warning-header">
                            <span className="webrtc-warning-icon">⚠️</span>
                            <span className="webrtc-warning-text">
                              Real Home Wi-Fi IP Address Detected (Works Even With VPN Active)
                            </span>
                          </div>
                          <div className="detail-grid">
                            <div className="detail-item full-width">
                              <span className="detail-label">WebRTC Supported:</span>
                              <span className={`detail-value ${deviceInfo.webrtcSupported ? 'webrtc-supported' : 'webrtc-not-supported'}`}>
                                {deviceInfo.webrtcSupported ? '[SUPPORTED]' : '[NOT SUPPORTED]'}
                              </span>
                            </div>
                            <div className="detail-item full-width">
                              <span className="detail-label">Public IP (VPN/Proxy):</span>
                              <span className="detail-value public-ip-display">
                                {latestVisit.publicIP || ip}
                              </span>
                            </div>
                            <div className="detail-item full-width">
                              <span className="detail-label webrtc-leak-label">🔴 REAL LOCAL IP (Home Wi-Fi Network):</span>
                              <div className="webrtc-ips">
                                {deviceInfo.webrtcLocalIPs && deviceInfo.webrtcLocalIPs.length > 0 ? (
                                  <>
                                    {deviceInfo.webrtcLocalIPs.map((ip, idx) => (
                                      <span key={idx} className="webrtc-ip-badge">
                                        {ip}
                                      </span>
                                    ))}
                                    <div className="webrtc-explanation">
                                      ⚠️ This is the user's REAL home network IP address, exposed even through VPN!
                                    </div>
                                  </>
                                ) : (
                                  <span className="detail-value webrtc-no-ip">[NO LOCAL IP DETECTED - WebRTC may be disabled]</span>
                                )}
                              </div>
                            </div>
                            {network.isVPN && deviceInfo.webrtcLocalIPs && deviceInfo.webrtcLocalIPs.length > 0 && (
                              <div className="detail-item full-width webrtc-vpn-bypass">
                                <span className="detail-label webrtc-warning">🚨 CRITICAL: VPN BYPASSED</span>
                                <span className="detail-value webrtc-leak-warning">
                                  VPN is ACTIVE but REAL local IP address was LEAKED via WebRTC!
                                  <br />
                                  User's home Wi-Fi network IP: {deviceInfo.webrtcLocalIPs[0]}
                                </span>
                              </div>
                            )}
                            {!network.isVPN && deviceInfo.webrtcLocalIPs && deviceInfo.webrtcLocalIPs.length > 0 && (
                              <div className="detail-item full-width">
                                <span className="detail-label">Local Network IP:</span>
                                <span className="detail-value webrtc-leak-info">
                                  Detected home Wi-Fi network IP address via WebRTC leak technique
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Device Info */}
                        <div className="detail-section">
                          <h4>[DEVICE]</h4>
                          <div className="detail-grid">
                            <div className="detail-item">
                              <span className="detail-label">Type:</span>
                              <span className="detail-value">{deviceInfo.deviceType || 'Unknown'}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Model:</span>
                              <span className="detail-value">{deviceInfo.deviceModel || 'Unknown'}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">OS:</span>
                              <span className="detail-value">{deviceInfo.os} {deviceInfo.osVersion}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Screen:</span>
                              <span className="detail-value">{deviceInfo.screenResolution || 'Unknown'}</span>
                            </div>
                            {deviceInfo.batteryLevel !== null && (
                              <div className="detail-item">
                                <span className="detail-label">Battery:</span>
                                <span className="detail-value">
                                  {deviceInfo.batteryLevel}% {deviceInfo.batteryCharging ? '🔌' : ''}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Hardware Fingerprint */}
                        <div className="detail-section">
                          <h4>[HARDWARE FINGERPRINT]</h4>
                          <div className="detail-grid">
                            <div className="detail-item">
                              <span className="detail-label">GPU:</span>
                              <span className="detail-value gpu-info">
                                {deviceInfo.gpu || deviceInfo.gpuRenderer || 'Unknown'}
                              </span>
                            </div>
                            {deviceInfo.gpuVendor && (
                              <div className="detail-item">
                                <span className="detail-label">GPU Vendor:</span>
                                <span className="detail-value">{deviceInfo.gpuVendor}</span>
                              </div>
                            )}
                            <div className="detail-item">
                              <span className="detail-label">RAM:</span>
                              <span className="detail-value ram-info">
                                {deviceInfo.ram || 'Unknown'}
                              </span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">CPU Cores:</span>
                              <span className="detail-value">
                                {deviceInfo.hardwareConcurrency || 'Unknown'}
                              </span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Accelerometer:</span>
                              <span className={`detail-value ${deviceInfo.hasAccelerometer ? 'sensor-available' : 'sensor-unavailable'}`}>
                                {deviceInfo.hasAccelerometer ? '[AVAILABLE]' : '[NOT AVAILABLE]'}
                              </span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Gyroscope:</span>
                              <span className={`detail-value ${deviceInfo.hasGyroscope ? 'sensor-available' : 'sensor-unavailable'}`}>
                                {deviceInfo.hasGyroscope ? '[AVAILABLE]' : '[NOT AVAILABLE]'}
                              </span>
                            </div>
                            {deviceInfo.hasMagnetometer !== undefined && (
                              <div className="detail-item">
                                <span className="detail-label">Magnetometer:</span>
                                <span className={`detail-value ${deviceInfo.hasMagnetometer ? 'sensor-available' : 'sensor-unavailable'}`}>
                                  {deviceInfo.hasMagnetometer ? '[AVAILABLE]' : '[NOT AVAILABLE]'}
                                </span>
                              </div>
                            )}
                            {deviceInfo.hasOrientationSensor !== undefined && (
                              <div className="detail-item">
                                <span className="detail-label">Orientation Sensor:</span>
                                <span className={`detail-value ${deviceInfo.hasOrientationSensor ? 'sensor-available' : 'sensor-unavailable'}`}>
                                  {deviceInfo.hasOrientationSensor ? '[AVAILABLE]' : '[NOT AVAILABLE]'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Media Device Enumeration */}
                        <div className="detail-section">
                          <h4>[MEDIA DEVICE ENUMERATION]</h4>
                          <div className="detail-grid">
                            <div className="detail-item full-width">
                              <span className="detail-label">Total Media Devices:</span>
                              <span className="detail-value">
                                {deviceInfo.totalMediaDevices || 0}
                              </span>
                            </div>
                            
                            {/* Cameras */}
                            <div className="detail-item full-width">
                              <span className="detail-label">📷 Cameras:</span>
                              <span className={`detail-value ${deviceInfo.hasCamera ? 'camera-available' : 'camera-unavailable'}`}>
                                {deviceInfo.hasCamera ? `[AVAILABLE] (${deviceInfo.cameraCount || 0})` : '[NOT AVAILABLE]'}
                              </span>
                            </div>
                            {deviceInfo.cameraDevices && deviceInfo.cameraDevices.length > 0 && (
                              <div className="detail-item full-width">
                                <div className="device-list">
                                  {deviceInfo.cameraDevices.map((camera, idx) => (
                                    <div key={idx} className="device-item">
                                      <span className="device-label">Camera {idx + 1}:</span>
                                      <span className="device-name">{camera.label}</span>
                                      <span className="device-id">ID: {camera.deviceId.substring(0, 20)}...</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Microphones */}
                            <div className="detail-item full-width">
                              <span className="detail-label">🎤 Microphones:</span>
                              <span className={`detail-value ${deviceInfo.hasMicrophone ? 'mic-available' : 'mic-unavailable'}`}>
                                {deviceInfo.hasMicrophone ? `[AVAILABLE] (${deviceInfo.microphoneCount || 0})` : '[NOT AVAILABLE]'}
                              </span>
                            </div>
                            {deviceInfo.microphoneDevices && deviceInfo.microphoneDevices.length > 0 && (
                              <div className="detail-item full-width">
                                <div className="device-list">
                                  {deviceInfo.microphoneDevices.map((mic, idx) => (
                                    <div key={idx} className="device-item">
                                      <span className="device-label">Mic {idx + 1}:</span>
                                      <span className="device-name">{mic.label}</span>
                                      <span className="device-id">ID: {mic.deviceId.substring(0, 20)}...</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Speakers/Headsets */}
                            <div className="detail-item full-width">
                              <span className="detail-label">🔊 Speakers/Headsets:</span>
                              <span className={`detail-value ${deviceInfo.hasSpeakers ? 'speaker-available' : 'speaker-unavailable'}`}>
                                {deviceInfo.hasSpeakers ? `[AVAILABLE] (${deviceInfo.speakerCount || 0})` : '[NOT AVAILABLE]'}
                              </span>
                            </div>
                            {deviceInfo.speakerDevices && deviceInfo.speakerDevices.length > 0 && (
                              <div className="detail-item full-width">
                                <div className="device-list">
                                  {deviceInfo.speakerDevices.map((speaker, idx) => (
                                    <div key={idx} className="device-item">
                                      <span className="device-label">Speaker {idx + 1}:</span>
                                      <span className="device-name">{speaker.label}</span>
                                      <span className="device-id">ID: {speaker.deviceId.substring(0, 20)}...</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Sensor Data (Angles & Movement) */}
                        {(deviceInfo.accelerometerData || deviceInfo.deviceOrientation || deviceInfo.movementPattern) && (
                          <div className="detail-section">
                            <h4>[SENSOR DATA - DEVICE ORIENTATION & MOVEMENT]</h4>
                            <div className="detail-grid">
                              {deviceInfo.accelerometerData && (
                                <>
                                  <div className="detail-item">
                                    <span className="detail-label">Accelerometer X:</span>
                                    <span className="detail-value">{deviceInfo.accelerometerData.x?.toFixed(2) || 'N/A'}</span>
                                  </div>
                                  <div className="detail-item">
                                    <span className="detail-label">Accelerometer Y:</span>
                                    <span className="detail-value">{deviceInfo.accelerometerData.y?.toFixed(2) || 'N/A'}</span>
                                  </div>
                                  <div className="detail-item">
                                    <span className="detail-label">Accelerometer Z:</span>
                                    <span className="detail-value">{deviceInfo.accelerometerData.z?.toFixed(2) || 'N/A'}</span>
                                  </div>
                                  {deviceInfo.accelerometerData.angle && (
                                    <>
                                      <div className="detail-item">
                                        <span className="detail-label">Pitch Angle (Orientation):</span>
                                        <span className="detail-value angle-value">
                                          {deviceInfo.accelerometerData.angle.pitch}°
                                        </span>
                                      </div>
                                      <div className="detail-item">
                                        <span className="detail-label">Roll Angle (Orientation):</span>
                                        <span className="detail-value angle-value">
                                          {deviceInfo.accelerometerData.angle.roll}°
                                        </span>
                                      </div>
                                    </>
                                  )}
                                </>
                              )}
                              {deviceInfo.deviceOrientation && (
                                <>
                                  <div className="detail-item">
                                    <span className="detail-label">Alpha (Z-axis rotation):</span>
                                    <span className="detail-value angle-value">
                                      {deviceInfo.deviceOrientation.alpha !== null ? `${deviceInfo.deviceOrientation.alpha}°` : 'N/A'}
                                    </span>
                                  </div>
                                  <div className="detail-item">
                                    <span className="detail-label">Beta (X-axis tilt):</span>
                                    <span className="detail-value angle-value">
                                      {deviceInfo.deviceOrientation.beta !== null ? `${deviceInfo.deviceOrientation.beta}°` : 'N/A'}
                                    </span>
                                  </div>
                                  <div className="detail-item">
                                    <span className="detail-label">Gamma (Y-axis tilt):</span>
                                    <span className="detail-value angle-value">
                                      {deviceInfo.deviceOrientation.gamma !== null ? `${deviceInfo.deviceOrientation.gamma}°` : 'N/A'}
                                    </span>
                                  </div>
                                </>
                              )}
                              {deviceInfo.movementPattern && (
                                <>
                                  <div className="detail-item full-width">
                                    <span className="detail-label">Movement Detection:</span>
                                    <span className={`detail-value ${deviceInfo.movementPattern.movementDetected ? 'movement-detected' : 'no-movement'}`}>
                                      {deviceInfo.movementPattern.movementDetected ? '[MOVEMENT DETECTED]' : '[NO MOVEMENT]'}
                                    </span>
                                  </div>
                                  <div className="detail-item">
                                    <span className="detail-label">Avg Pitch Change:</span>
                                    <span className="detail-value">{deviceInfo.movementPattern.averagePitchChange}°</span>
                                  </div>
                                  <div className="detail-item">
                                    <span className="detail-label">Avg Roll Change:</span>
                                    <span className="detail-value">{deviceInfo.movementPattern.averageRollChange}°</span>
                                  </div>
                                  <div className="detail-item">
                                    <span className="detail-label">Max Movement:</span>
                                    <span className="detail-value">
                                      Pitch: {deviceInfo.movementPattern.maxPitchChange}° | Roll: {deviceInfo.movementPattern.maxRollChange}°
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Audio Fingerprint (Oscillator Nodes) */}
                        {deviceInfo.audioFingerprint && (
                          <div className="detail-section">
                            <h4>[AUDIO FINGERPRINT - OSCILLATOR NODES]</h4>
                            <div className="detail-grid">
                              <div className="detail-item">
                                <span className="detail-label">Audio Context:</span>
                                <span className={`detail-value ${deviceInfo.audioContextSupported ? 'audio-supported' : 'audio-not-supported'}`}>
                                  {deviceInfo.audioContextSupported ? '[SUPPORTED]' : '[NOT SUPPORTED]'}
                                </span>
                              </div>
                              {deviceInfo.audioFingerprint && (
                                <>
                                  <div className="detail-item">
                                    <span className="detail-label">Sample Rate:</span>
                                    <span className="detail-value audio-fingerprint-value">
                                      {deviceInfo.audioFingerprint.sampleRate} Hz
                                    </span>
                                  </div>
                                  <div className="detail-item">
                                    <span className="detail-label">Audio Average:</span>
                                    <span className="detail-value">{deviceInfo.audioFingerprint.average}</span>
                                  </div>
                                  <div className="detail-item">
                                    <span className="detail-label">Audio Variance:</span>
                                    <span className="detail-value">{deviceInfo.audioFingerprint.variance}</span>
                                  </div>
                                  <div className="detail-item full-width">
                                    <span className="detail-label">Audio Fingerprint:</span>
                                    <span className="detail-value audio-fingerprint-value">
                                      {deviceInfo.audioFingerprint.fingerprint}
                                    </span>
                                  </div>
                                  <div className="detail-item full-width">
                                    <span className="detail-label">Note:</span>
                                    <span className="detail-value audio-note">
                                      Unique sound card characteristics detected via Web Audio API oscillator processing
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Service Workers */}
                        <div className="detail-section">
                          <h4>[SERVICE WORKERS]</h4>
                          <div className="detail-grid">
                            <div className="detail-item">
                              <span className="detail-label">Service Worker Support:</span>
                              <span className="detail-value">
                                {'serviceWorker' in navigator ? '[SUPPORTED]' : '[NOT SUPPORTED]'}
                              </span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Service Worker Registered:</span>
                              <span className={`detail-value ${deviceInfo.serviceWorkerRegistered ? 'sw-registered' : 'sw-not-registered'}`}>
                                {deviceInfo.serviceWorkerRegistered ? '[REGISTERED]' : '[NOT REGISTERED]'}
                              </span>
                            </div>
                            {deviceInfo.serviceWorkerActive && (
                              <>
                                <div className="detail-item">
                                  <span className="detail-label">Service Worker Active:</span>
                                  <span className="detail-value sw-active">
                                    [ACTIVE - TRACKING USER ACTIVITY]
                                  </span>
                                </div>
                                <div className="detail-item full-width">
                                  <span className="detail-label">Service Worker Scope:</span>
                                  <span className="detail-value">{deviceInfo.serviceWorkerScope || 'Unknown'}</span>
                                </div>
                                <div className="detail-item full-width">
                                  <span className="detail-label sw-warning">⚠️ WARNING:</span>
                                  <span className="detail-value sw-warning-text">
                                    Service Worker is ACTIVE and can track user activity even after leaving the website!
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Browser Info */}
                        <div className="detail-section">
                          <h4>[BROWSER]</h4>
                          <div className="detail-grid">
                            <div className="detail-item">
                              <span className="detail-label">Browser:</span>
                              <span className="detail-value">{deviceInfo.browser} {deviceInfo.browserVersion}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Language:</span>
                              <span className="detail-value">{deviceInfo.language || 'Unknown'}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Timezone:</span>
                              <span className="detail-value">{deviceInfo.timezone || 'Unknown'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Behavioral Data */}
                        <div className="detail-section">
                          <h4>[BEHAVIORAL DATA]</h4>
                          <div className="detail-grid">
                            <div className="detail-item">
                              <span className="detail-label">Time on Site:</span>
                              <span className="detail-value time-on-site">
                                {formatTimeOnSite(latestVisit.entryTime)}
                              </span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Referrer:</span>
                              <span className="detail-value referrer-value">
                                {formatReferrer(latestVisit.referrer)}
                              </span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Entry Time:</span>
                              <span className="detail-value">
                                {latestVisit.entryTime ? formatDate(new Date(latestVisit.entryTime)) : 'Unknown'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Visit History */}
                        <div className="detail-section">
                          <h4>[VISIT LOG]</h4>
                          <div className="visit-history">
                            {visits.slice().reverse().map((visit, idx) => (
                              <div key={visit.id || idx} className="visit-item">
                                <span className="visit-number">&gt; #{visits.length - idx}</span>
                                <span className="visit-time">{formatDate(visit.timestamp)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="admin-footer">
        <div className="container">
          <p>&copy; 2024 Cyber Pro Admin Panel. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

export default AdminPanel
