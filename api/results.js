// API endpoint to get student results
const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Read results.json - FIXED PATH for Vercel
    const resultsPath = path.join(process.cwd(), 'db', 'results.json');
    console.log('Reading results from:', resultsPath);
    
    const resultsData = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
    
    // Log for debugging
    console.log(`Loaded ${resultsData.students?.length || 0} students`);
    
    res.status(200).json(resultsData);
    
  } catch (error) {
    console.error('Error reading results:', error);
    res.status(500).json({ 
      error: 'Failed to load results',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};