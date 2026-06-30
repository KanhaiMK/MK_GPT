const { GoogleGenAI } = require('@google/genai')

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

async function getEmbedding(text) {
    const response = await genAI.models.embedContent({
        model: 'gemini-embedding-001',
        contents: text,
    })
    return response.embeddings[0].values
}

async function findSimilarChunks(queryEmbedding, chunks, topK = 4, threshold = 0.4) {
    const scored = chunks.map((chunk) => ({
        chunk,
        score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }));

    scored.sort((a, b) => b.score - a.score);

    // Only keep chunks above the similarity threshold
    const relevant = scored.filter((item) => item.score >= threshold);

    return relevant.slice(0, topK).map((item) => item.chunk);
}

function cosineSimilarity(vecA, vecB) {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0)
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0))
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0))
    return dotProduct / (magnitudeA * magnitudeB)
}

module.exports = { getEmbedding, cosineSimilarity, findSimilarChunks }