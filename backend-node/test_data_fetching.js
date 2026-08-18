const BASE_URL = 'https://backend.supplysetu.app/api/v1';

async function run() {
  console.log("=== TESTING LIVE DATA ENDPOINTS ===");

  // 1. Login Admin
  let token = '';
  try {
    const loginRes = await fetch(`${BASE_URL}/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@ambdmp.com', password: 'change-me-on-first-login' })
    });
    const loginData = await loginRes.json();
    token = loginData.access_token || loginData.accessToken || loginData.token;
    console.log("✓ Login successful. Token:", token ? "YES" : "NO");
  } catch (err) {
    console.error("Login failed:", err);
    return;
  }

  const headers = { 'Authorization': `Bearer ${token}` };

  const endpoints = [
    '/categories',
    '/products?page_size=10',
    '/admin/retailers',
    '/purchases/suppliers',
    '/admin/orders?page_size=10',
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(`${BASE_URL}${ep}`, { headers });
      const status = res.status;
      const data = await res.json();
      console.log(`\nEndpoint: ${ep}`);
      console.log(`Status: ${status}`);
      if (Array.isArray(data)) {
        console.log(`Array length: ${data.length}`);
      } else if (data && typeof data === 'object') {
        console.log(`Keys: ${Object.keys(data).join(', ')}`);
        if (data.products) console.log(`Products length: ${data.products.length}`);
        if (data.orders) console.log(`Orders length: ${data.orders.length}`);
        if (data.entries) console.log(`Entries length: ${data.entries.length}`);
      } else {
        console.log("Response data:", data);
      }
    } catch (err) {
      console.error(`Error on ${ep}:`, err.message);
    }
  }
}

run();
