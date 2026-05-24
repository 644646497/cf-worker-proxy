// ==================== 配置区 ====================
const uuid = 'e7d0ace2-efe0-48e1-b010-196cc5e1dab4';
const API_KEY = 'xkL9mN3pQrT5vY7wZ2aB4cD6eF8gH1jK';
// ================================================

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;
    
    // ========== API 接口：获取订阅链接 ==========
    if (url.pathname === '/api/subscribe' && method === 'GET') {
      const auth = request.headers.get('Authorization');
      if (auth !== `Bearer ${API_KEY}`) {
        return new Response(JSON.stringify({ 
          error: 'Unauthorized', 
          message: 'Invalid API key' 
        }), { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      try {
        let PROXYIP = '';
        try {
          PROXYIP = await env.PROXYIP_KV.get('proxyip') || '';
        } catch (e) {}
        
        const config = {
          v: "2",
          ps: PROXYIP ? `CF-Worker (${PROXYIP})` : "CF-Worker",
          add: url.hostname,
          port: "443",
          id: uuid,
          aid: "0",
          net: "ws",
          type: "none",
          host: url.hostname,
          path: "/",
          tls: "tls"
        };
        
        const vmess = `vmess://${btoa(JSON.stringify(config))}`;
        
        return new Response(JSON.stringify({
          success: true,
          subscription_url: `https://${url.hostname}/${uuid}`,
          vmess_link: vmess,
          proxy_ip: PROXYIP || 'none',
          config: config
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
        
      } catch (e) {
        return new Response(JSON.stringify({ 
          error: 'Internal Server Error', 
          message: e.message 
        }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // ========== API 接口：获取当前 PROXYIP ==========
    if (url.pathname === '/api/proxyip' && method === 'GET') {
      const auth = request.headers.get('Authorization');
      if (auth !== `Bearer ${API_KEY}`) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      try {
        let PROXYIP = await env.PROXYIP_KV.get('proxyip') || '';
        return new Response(JSON.stringify({ proxyip: PROXYIP }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // ========== API 接口：更新 PROXYIP ==========
    if (url.pathname === '/api/proxyip' && method === 'POST') {
      const auth = request.headers.get('Authorization');
      if (auth !== `Bearer ${API_KEY}`) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      try {
        const newIP = await request.text();
        if (newIP && newIP.trim()) {
          await env.PROXYIP_KV.put('proxyip', newIP.trim());
          return new Response(JSON.stringify({ 
            success: true, 
            message: 'PROXYIP updated',
            proxyip: newIP.trim()
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        return new Response(JSON.stringify({ 
          error: 'Invalid IP address' 
        }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // ========== 订阅地址 ==========
    if (url.pathname === `/${uuid}`) {
      let PROXYIP = '';
      try {
        PROXYIP = await env.PROXYIP_KV.get('proxyip') || '';
      } catch (e) {}
      
      const config = {
        v: "2",
        ps: PROXYIP ? `CF-Worker (${PROXYIP})` : "CF-Worker",
        add: url.hostname,
        port: "443",
        id: uuid,
        aid: "0",
        net: "ws",
        type: "none",
        host: url.hostname,
        path: "/",
        tls: "tls"
      };
      
      const vmess = `vmess://${btoa(JSON.stringify(config))}`;
      return new Response(vmess, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
    
    // ========== WebSocket 代理 ==========
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader && upgradeHeader.toLowerCase() === 'websocket') {
      return fetch(request);
    }
    
    // ========== 普通请求代理 ==========
    let PROXYIP = '';
    try {
      PROXYIP = await env.PROXYIP_KV.get('proxyip') || '';
    } catch (e) {}
    
    let targetUrl = request.url;
    if (PROXYIP) {
      const newUrl = new URL(request.url);
      newUrl.hostname = PROXYIP;
      targetUrl = newUrl.toString();
    }
    
    const newRequest = new Request(targetUrl, request);
    newRequest.headers.set('Host', url.hostname);
    newRequest.headers.set('User-Agent', 'Mozilla/5.0');
    
    return fetch(newRequest);
  }
};
