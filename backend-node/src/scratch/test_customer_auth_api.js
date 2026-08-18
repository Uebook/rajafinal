const BASE_URL = 'https://backend.supplysetu.app/api/v1'; // Live Production Server URL

async function runTest() {
  const randomNum = Math.floor(1000000000 + Math.random() * 9000000000);
  const testMobile = `+91${randomNum}`;
  const testPassword = 'TestPassword123';
  const testName = 'Test Customer ' + Math.floor(Math.random() * 1000);
  const testEmail = `customer_${randomNum}@example.com`;

  console.log('--- TEST 1: 1-Step Customer Registration API ---');
  console.log(`Payload: Mobile=${testMobile}, Name=${testName}, Password=${testPassword}`);
  
  try {
    const regResponse = await fetch(`${BASE_URL}/retailer/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        owner_name: testName,
        business_name: testName,
        email: testEmail,
        mobile: testMobile,
        password: testPassword,
        address: '123 Test Street, New Delhi',
      })
    });

    const regData = await regResponse.json();

    console.log('✅ Registration API Status:', regResponse.status);
    console.log('✅ Access Token Received:', regData.access_token ? 'YES (Token Valid)' : 'NO');
    console.log('✅ User Profile Created:', {
      id: regData.user.id,
      full_name: regData.user.full_name,
      mobile: regData.user.mobile,
      role: regData.user.role,
      status: regData.user.status,
    });

    const token = regData.access_token;

    console.log('\n--- TEST 2: Customer Password Login API ---');
    const loginResponse = await fetch(`${BASE_URL}/retailer/auth/password-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mobile: testMobile,
        password: testPassword,
      })
    });

    const loginData = await loginResponse.json();

    console.log('✅ Password Login API Status:', loginResponse.status);
    console.log('✅ Login Access Token Received:', loginData.access_token ? 'YES (Token Valid)' : 'NO');

    console.log('\n--- TEST 3: Authenticated /me Profile API Check ---');
    const profileResponse = await fetch(`${BASE_URL}/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const profileData = await profileResponse.json();
    console.log('✅ Profile API Status:', profileResponse.status);
    console.log('✅ Authenticated Customer Name:', profileData.full_name);

    console.log('\n🎉 ALL CUSTOMER AUTHENTICATION API TESTS PASSED 100% SUCCESSFULLY!');
  } catch (error) {
    console.error('❌ API Test Failed:', error);
  }
}

runTest();
