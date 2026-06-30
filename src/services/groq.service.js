const Groq = require('groq-sdk')

async function getChatResponse(messages) {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
    const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: messages,
        temperature: 0.3,   // ← add this. Default is 1.0, we lower it for factual RAG
    })
    return response.choices[0].message.content
}

async function getChatResponseStream(messages) {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
    const stream = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: messages,
        stream: true,
        temperature: 0.3,   // ← same here
    })
    return stream
}

module.exports = { 
    getChatResponse, 
    getChatResponseStream 
}