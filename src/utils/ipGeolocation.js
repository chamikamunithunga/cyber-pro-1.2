// Client-side IP geolocation utility
// This replaces the server-side getIPInfo function

export async function getIPInfo(ip) {
  // Skip geolocation lookup only if IP is truly invalid or null
  if (!ip || ip === '127.0.0.1' || ip === '::1') {
    // Still try to get location even for localhost by using a service that detects public IP
    try {
      // Try to get location using ip-api.com with empty query (gets requester's IP)
      const response = await fetch(`http://ip-api.com/json/?fields=status,message,country,regionName,city,lat,lon,isp,org,as,proxy,hosting,query`);
      const data = await response.json();
      
      if (data.status === 'success') {
        // Enhanced VPN/Proxy detection for localhost fallback
        const isHosting = data.hosting === true;
        const isProxy = data.proxy === true;
        const fakeIPIndicators = [];
        
        const ispLower = (data.isp || '').toLowerCase();
        const orgLower = (data.org || '').toLowerCase();
        const vpnKeywords = ['vpn', 'proxy', 'hosting', 'datacenter', 'server', 'cloud', 'aws', 'azure', 'google cloud', 'digitalocean', 'linode', 'vultr', 'ovh'];
        
        vpnKeywords.forEach(keyword => {
          if (ispLower.includes(keyword) || orgLower.includes(keyword)) {
            fakeIPIndicators.push(`ISP/Org contains "${keyword}"`);
          }
        });
        
        return {
          country: data.country || 'Unknown',
          city: data.city || 'Unknown',
          region: data.regionName || 'Unknown',
          isp: data.isp || 'Unknown',
          organization: data.org || 'Unknown',
          asn: data.as || 'Unknown',
          isVPN: isHosting || fakeIPIndicators.length > 0,
          isProxy: isProxy,
          fakeIPIndicators: fakeIPIndicators,
          latitude: data.lat || null,
          longitude: data.lon || null
        };
      }
    } catch (error) {
      console.error('Error fetching location for localhost:', error);
    }
    
    // Return Unknown instead of "Local"
    return {
      country: 'Unknown',
      city: 'Unknown',
      region: 'Unknown',
      isp: 'Unknown',
      isVPN: false,
      isProxy: false,
      fakeIPIndicators: [],
      latitude: null,
      longitude: null
    };
  }

  try {
    // Using ip-api.com (free, no API key required)
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,regionName,city,lat,lon,isp,org,as,proxy,hosting,query`);
    const data = await response.json();
    
    if (data.status === 'success') {
      // Enhanced VPN/Proxy detection with fake IP indicators
      const isHosting = data.hosting === true;
      const isProxy = data.proxy === true;
      
      // Check for fake IP indicators
      const fakeIPIndicators = [];
      
      // Check if ISP is a known VPN/Proxy provider
      const ispLower = (data.isp || '').toLowerCase();
      const orgLower = (data.org || '').toLowerCase();
      const vpnKeywords = ['vpn', 'proxy', 'hosting', 'datacenter', 'server', 'cloud', 'aws', 'azure', 'google cloud', 'digitalocean', 'linode', 'vultr', 'ovh'];
      
      vpnKeywords.forEach(keyword => {
        if (ispLower.includes(keyword) || orgLower.includes(keyword)) {
          fakeIPIndicators.push(`ISP/Org contains "${keyword}"`);
        }
      });
      
      // Check if ASN is from datacenter/hosting
      if (data.as) {
        const asnLower = data.as.toLowerCase();
        if (asnLower.includes('hosting') || asnLower.includes('datacenter') || asnLower.includes('server')) {
          fakeIPIndicators.push('ASN indicates hosting/datacenter');
        }
      }
      
      // Check for suspicious organization names
      const suspiciousOrgs = ['amazon', 'microsoft', 'google', 'cloudflare', 'fastly', 'akamai'];
      suspiciousOrgs.forEach(org => {
        if (orgLower.includes(org) && !orgLower.includes('internet')) {
          fakeIPIndicators.push(`Organization: ${org} (likely cloud/VPN)`);
        }
      });
      
      return {
        country: data.country || 'Unknown',
        city: data.city || 'Unknown',
        region: data.regionName || 'Unknown',
        isp: data.isp || 'Unknown',
        organization: data.org || 'Unknown',
        asn: data.as || 'Unknown',
        isVPN: isHosting || fakeIPIndicators.length > 0,
        isProxy: isProxy,
        fakeIPIndicators: fakeIPIndicators,
        latitude: data.lat || null,
        longitude: data.lon || null
      };
    }
  } catch (error) {
    console.error('Error fetching IP info:', error);
  }

  return {
    country: 'Unknown',
    city: 'Unknown',
    region: 'Unknown',
    isp: 'Unknown',
    isVPN: false,
    isProxy: false,
    fakeIPIndicators: [],
    latitude: null,
    longitude: null
  };
}

