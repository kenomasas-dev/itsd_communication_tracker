// Test script to verify the toggle endpoint is working
const apiUrl = 'http://localhost:5000/api/auth/users/1/toggle-status';

async function testToggle() {
  try {
    console.log('Testing toggle endpoint:', apiUrl);
    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const data = await response.json();
    console.log('Response:', data);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testToggle();
