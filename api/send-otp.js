// API endpoint to send OTP via SMS
const twilio = require('twilio');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    
    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`📱 Generated OTP for ${phoneNumber}: ${otp}`);
    
    // Send SMS with Twilio if credentials exist
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      try {
        const client = twilio(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN
        );
        
        const message = await client.messages.create({
          body: `Your Student Portal verification code: ${otp}. Valid for 10 minutes.`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phoneNumber
        });
        
        console.log(`✅ SMS sent to ${phoneNumber}, SID: ${message.sid}`);
        
        res.json({ 
          success: true, 
          message: 'OTP sent via SMS'
          // DON'T send OTP in response for security!
        });
        
      } catch (twilioError) {
        console.error('Twilio SMS failed:', twilioError.message);
        // Fall back to returning OTP (for development/testing)
        res.json({ 
          success: true, 
          message: 'Twilio failed, OTP logged to console',
          otp: otp // For testing only
        });
      }
    } else {
      // No Twilio credentials, return OTP for testing
      console.log(`📱 [NO TWILIO] OTP for ${phoneNumber}: ${otp}`);
      res.json({ 
        success: true, 
        message: 'OTP generated (check Vercel logs)',
        otp: otp // For testing
      });
    }
    
  } catch (error) {
    console.error('Error in send-otp:', error);
    res.status(500).json({ 
      error: 'Failed to send OTP',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};