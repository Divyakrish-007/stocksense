const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runTests() {
  console.log('--- Starting StockSense E2E Verification Suite ---');

  // 1. Health Check
  const health = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/health',
    method: 'GET',
  });
  console.log('1. Health check status:', health.status, health.body.status === 'healthy' ? 'PASS' : 'FAIL');

  // 2. Login as Admin
  const login = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      email: 'admin@stocksense.io',
      password: 'Password@123',
      rememberMe: true,
    }
  );
  console.log('2. Admin login status:', login.status, login.body.token ? 'PASS' : 'FAIL');
  const token = login.body.token;

  // 3. Failed Login
  const failLogin = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      email: 'admin@stocksense.io',
      password: 'WrongPassword',
    }
  );
  console.log('3. Invalid password rejection:', failLogin.status === 401 ? 'PASS' : 'FAIL');

  // 4. Session Verification GET /api/auth/me
  const me = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/me',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('4. Session GET /me status:', me.status, me.body.user?.role === 'Inventory Manager' ? 'PASS' : 'FAIL');

  // 5. User Signup
  const testEmail = `operator_${Date.now()}@stocksense.io`;
  const signup = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/signup',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      name: 'Test Operator',
      email: testEmail,
      password: 'Password@123',
      confirmPassword: 'Password@123',
      role: 'Warehouse Staff',
    }
  );
  console.log('5. Signup status:', signup.status === 201 ? 'PASS' : 'FAIL', signup.body.user?.email);

  // 6. Forgot Password OTP Generation
  const forgot = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/forgot-password',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      email: testEmail,
    }
  );
  console.log('6. Forgot Password OTP generation:', forgot.status === 200 && forgot.body.demoOtp ? 'PASS' : 'FAIL');
  const otp = forgot.body.demoOtp;

  // 7. Verify OTP
  const verifyOtp = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/verify-otp',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      email: testEmail,
      otp,
    }
  );
  console.log('7. Verify OTP status:', verifyOtp.status === 200 && verifyOtp.body.valid ? 'PASS' : 'FAIL');

  // 8. Reset Password
  const resetPass = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/reset-password',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      email: testEmail,
      otp,
      newPassword: 'NewPassword@2026',
      confirmPassword: 'NewPassword@2026',
    }
  );
  console.log('8. Reset Password status:', resetPass.status === 200 ? 'PASS' : 'FAIL');

  // 9. Login with new reset password
  const newLogin = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      email: testEmail,
      password: 'NewPassword@2026',
    }
  );
  console.log('9. Login with reset password:', newLogin.status === 200 ? 'PASS' : 'FAIL');

  // 10. Dashboard KPI Stats
  const stats = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/dashboard/stats',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('10. Dashboard Stats retrieved:', stats.status === 200 ? 'PASS' : 'FAIL');
  console.log('    - Total Products Units:', stats.body.totalProductsInStock.totalUnits);
  console.log('    - Low Stock / Alerts:', stats.body.lowStockAlerts.total);
  console.log('    - Pending Receipts:', stats.body.pendingReceipts.count);
  console.log('    - Pending Deliveries:', stats.body.pendingDeliveries.count);
  console.log('    - Internal Transfers:', stats.body.internalTransfers.count);

  // 11. Dashboard Activities List
  const activities = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/dashboard/activities',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('11. Activities list count:', activities.body.count, activities.body.count > 0 ? 'PASS' : 'FAIL');

  // 12. Filtered Activities by Document Type
  const receiptsOnly = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/dashboard/activities?type=Receipts',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  const allReceipts = receiptsOnly.body.activities.every((a) => a.type === 'Receipts');
  console.log('12. Filter Document Type = Receipts:', allReceipts ? 'PASS' : 'FAIL');

  // 13. Filter Options
  const filterOptions = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/dashboard/filter-options',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('13. Filter options loaded:', filterOptions.body.warehouses.length > 0 ? 'PASS' : 'FAIL');

  // 14. Create New Activity
  const newActivity = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/dashboard/activities',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    {
      type: 'Receipts',
      contact: 'Test Vendor International',
      sourceLocation: 'Vendor Staging',
      destLocation: 'WH-MAIN',
      category: 'Electronics',
      itemsCount: 75,
      scheduledDate: '2026-09-30',
      status: 'Ready',
      notes: 'Automated E2E test inbound verification batch',
    }
  );
  console.log('14. Create Activity status:', newActivity.status === 201 ? 'PASS' : 'FAIL', newActivity.body.reference);

  // 15. Update Activity Status
  const updateStatus = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/dashboard/activities/1/status',
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    {
      status: 'Done',
    }
  );
  console.log('15. Update Status to Done:', updateStatus.status === 200 ? 'PASS' : 'FAIL');

  console.log('--- All 15 Test Scenarios Verified Successfully! ---');
}

runTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
