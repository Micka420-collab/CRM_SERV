const axios = require('axios');

async function testLogin(username, password) {
    try {
        console.log(`Testing login for: ${username}`);
        const response = await axios.post('http://localhost:3000/api/login', {
            username: username,
            password: password
        });
        console.log('Login Success:', response.data.user.username);
    } catch (error) {
        console.log('Login Failed:', error.response?.status, error.response?.data || error.message);
    }
}

(async () => {
    await testLogin('Mick', 'admin3150');
    await testLogin('admin', 'admin123');
})();
