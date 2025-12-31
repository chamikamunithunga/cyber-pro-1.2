import { useEffect, useState } from 'react'
import { collectDeviceInfo, getPublicIP } from './utils/deviceInfo.js'
import { saveVisitorData } from './utils/firebase.js'
import { getIPInfo } from './utils/ipGeolocation.js'
import './App.css'

// Sample products data
const products = [
  {
    id: 1,
    name: 'Premium Laptop',
    price: 1299.99,
    image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500',
    description: 'High-performance laptop for professionals'
  },
  {
    id: 2,
    name: 'Wireless Headphones',
    price: 199.99,
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
    description: 'Noise-cancelling wireless headphones'
  },
  {
    id: 3,
    name: 'Smart Watch',
    price: 349.99,
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
    description: 'Advanced fitness tracking smartwatch'
  },
  {
    id: 4,
    name: 'Gaming Mouse',
    price: 79.99,
    image: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=500',
    description: 'Precision gaming mouse with RGB lighting'
  },
  {
    id: 5,
    name: 'Mechanical Keyboard',
    price: 149.99,
    image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500',
    description: 'RGB mechanical keyboard for gamers'
  },
  {
    id: 6,
    name: '4K Monitor',
    price: 599.99,
    image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500',
    description: '27-inch 4K UHD display monitor'
  }
]

function App() {
  const [cart, setCart] = useState([])
  const [tracked, setTracked] = useState(false)
  const [entryTime] = useState(Date.now()) // Track when user entered the site

  // Track IP address when component mounts (only once per session)
  useEffect(() => {
    const trackIP = async () => {
      // Check if IP was already tracked in this session
      const alreadyTracked = sessionStorage.getItem('ipTracked')
      
      if (alreadyTracked === 'true') {
        setTracked(true)
        return
      }
      
      try {
        // Collect detailed device information
        const deviceInfo = await collectDeviceInfo()
        
        // Get user's public IP address
        const publicIP = await getPublicIP()
        
        // Get referrer (where user came from)
        const referrer = document.referrer || 'Direct Visit'
        
        // Get IP geolocation and ISP info using the public IP (client-side)
        const ipInfo = await getIPInfo(publicIP || '127.0.0.1')
        
        // Generate Unique Visitor ID
        const userAgent = navigator.userAgent || 'Unknown'
        const fingerprint = `${userAgent}-${deviceInfo.screenResolution}-${deviceInfo.language}-${deviceInfo.timezone}`
        const fingerprintHash = btoa(fingerprint).substring(0, 16)
        const uniqueVisitorID = `VIS-${Date.now().toString(36)}-${fingerprintHash}`.toUpperCase()
        
        const timestamp = new Date().toISOString()
        const now = Date.now()
        
        // Prepare visitor data
        const ipData = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          uniqueVisitorID: uniqueVisitorID,
          ip: publicIP || '127.0.0.1', // Use public IP as primary
          publicIP: publicIP || '127.0.0.1',
          userAgent: userAgent,
          timestamp: timestamp,
          page: 'Product Sale Website',
          visitCount: 1,
          entryTime: entryTime,
          referrer: referrer,
          
          // Device Info
          deviceInfo: {
            ...deviceInfo,
            screenResolution: deviceInfo.screenResolution || 'Unknown',
            browser: deviceInfo.browser || 'Unknown',
            browserVersion: deviceInfo.browserVersion || 'Unknown',
            os: deviceInfo.os || 'Unknown',
            osVersion: deviceInfo.osVersion || 'Unknown',
            deviceType: deviceInfo.deviceType || 'Unknown',
            deviceModel: deviceInfo.deviceModel || 'Unknown',
            isMobile: deviceInfo.isMobile || false,
            isTablet: deviceInfo.isTablet || false,
            language: deviceInfo.language || 'Unknown',
            batteryLevel: deviceInfo.batteryLevel,
            batteryCharging: deviceInfo.batteryCharging,
            connectionType: deviceInfo.connectionType || 'Unknown',
            connectionEffectiveType: deviceInfo.connectionEffectiveType || 'Unknown',
            timezone: deviceInfo.timezone || 'Unknown',
            viewportWidth: deviceInfo.viewportWidth || 'Unknown',
            viewportHeight: deviceInfo.viewportHeight || 'Unknown',
          },
          
          // IP Geolocation Info
          location: {
            country: ipInfo.country,
            city: ipInfo.city,
            region: ipInfo.region,
            latitude: ipInfo.latitude,
            longitude: ipInfo.longitude
          },
          
          // Network Info
          network: {
            isp: ipInfo.isp,
            organization: ipInfo.organization,
            asn: ipInfo.asn,
            isVPN: ipInfo.isVPN,
            isProxy: ipInfo.isProxy,
            fakeIPIndicators: ipInfo.fakeIPIndicators || []
          }
        }
        
        // Save directly to Firebase (serverless)
        await saveVisitorData(ipData)
        console.log('✅ IP tracked and saved to Firebase:', {
          ip: ipData.publicIP,
          visitCount: ipData.visitCount,
          location: `${ipData.location.city}, ${ipData.location.country}`,
          device: `${ipData.deviceInfo.deviceType} - ${ipData.deviceInfo.os}`
        })
        
        setTracked(true)
        
        // Mark as tracked in session storage
        sessionStorage.setItem('ipTracked', 'true')
        sessionStorage.setItem('entryTime', entryTime.toString())
      } catch (error) {
        console.error('❌ Failed to track IP:', error)
        console.error('Error details:', error.message)
      }
    }
    
    trackIP()
  }, [entryTime])

  // Time on site is calculated on the admin panel side, no need to send updates

  const addToCart = (product) => {
    setCart([...cart, product])
  }

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId))
  }

  const getTotal = () => {
    return cart.reduce((sum, item) => sum + item.price, 0).toFixed(2)
  }

  return (
    <div className="app">
      <header className="header">
        <div className="container">
          <h1>🛍️  Pro Store</h1>
        </div>
      </header>

      <main className="main-content">
        <div className="container">
          <div className="hero-section">
            <h2>Welcome to  Pro Store</h2>
            <p>Discover amazing products at unbeatable prices</p>
          </div>

          <div className="products-grid">
            {products.map(product => (
              <div key={product.id} className="product-card">
                <div className="product-image">
                  <img src={product.image} alt={product.name} />
                </div>
                <div className="product-info">
                  <h3>{product.name}</h3>
                  <p className="product-description">{product.description}</p>
                  <div className="product-footer">
                    <span className="price">${product.price}</span>
                    <button 
                      onClick={() => addToCart(product)}
                      className="btn-add-cart"
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {cart.length > 0 && (
            <div className="cart-section">
              <h2>Your Cart ({cart.length} items)</h2>
              <div className="cart-items">
                {cart.map(item => (
                  <div key={item.id} className="cart-item">
                    <img src={item.image} alt={item.name} />
                    <div className="cart-item-info">
                      <h4>{item.name}</h4>
                      <p>${item.price}</p>
                    </div>
                    <button 
                      onClick={() => removeFromCart(item.id)}
                      className="btn-remove"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <div className="cart-total">
                <h3>Total: ${getTotal()}</h3>
                <button className="btn-checkout">Proceed to Checkout</button>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="footer">
        <div className="container">
          <p>&copy;  Pro Store. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

export default App

