const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
// Increased JSON limit to handle large CSV batch payloads
app.use(express.json({ limit: '50mb' })); 

// Initialize Groq AI
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY }); 

// The new incremental batch processing route
app.post('/api/process-batch', async (req, res) => {
    const { batch } = req.body;
    
    if (!batch || !Array.isArray(batch)) {
        return res.status(400).json({ error: 'Invalid batch data received' });
    }

    try {
        const prompt = `
        You are a data mapping assistant. Convert the following JSON array of CSV records into a structured JSON array matching exactly these keys: created_at, name, email, country_code, mobile_without_country_code, company, city, state, country, lead_owner, crm_status, crm_note, data_source, possession_time, description.
        
        Strict Rules:
        1. crm_status MUST ONLY BE: GOOD_LEAD_FOLLOW_UP, DID_NOT_CONNECT, BAD_LEAD, or SALE_DONE.
        2. data_source MUST ONLY BE: leads_on_demand, meridian_tower, eden_park, varah_swamy, sarjapur_plots, or blank.
        3. Skip records with NO email AND NO mobile number entirely. Do not include them in the output array.
        4. If there are multiple emails or phones, put the first in the main field and append the rest to crm_note.
        5. Ensure created_at is a valid date string.
        
        Raw Data: ${JSON.stringify(batch)}
        
        Respond ONLY with a valid JSON array. Do not include markdown formatting, backticks, or explanations. Just the raw JSON array.
        `;

        // Using the active, supported Llama 3.1 model
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "user",
                    content: prompt,
                },
            ],
            model: "llama-3.1-8b-instant", 
            temperature: 0, // Strict deterministic output
        });

        let rawText = chatCompletion.choices[0]?.message?.content || "";
        
        // Clean up markdown block formatting if the AI accidentally includes it
        rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const formattedData = JSON.parse(rawText);

        res.json({ data: formattedData });

    } catch (error) {
        console.error("Batch AI Processing Error:", error);
        res.status(500).json({ error: 'AI Processing Failed for this batch' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Ready to accept CSV batches via POST /api/process-batch`);
});