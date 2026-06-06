require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Report = mongoose.model('Report', new mongoose.Schema({}, { strict: false }));
  
  const r = await Report.findOne().sort({ createdAt: -1 });
  if (r) {
    console.log('ID:', r._id);
    console.log('Score:', r.aiAnalysisResults?.overallScore);
    console.log('Reasoning:', r.aiAnalysisResults?.reasoning);
    console.log('STEP 5 excerpt:', r.aiAnalysisResults?.contentAnalysis?.match(/STEP 5:.*?(?=??? STEP 6|??? FLAGS|$)/s)?.[0] || 'Not found');
  }
  mongoose.disconnect();
}
check();
