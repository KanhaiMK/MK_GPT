const pdfParse = require("pdf-parse-fork");
const Document = require("../models/document.model");
const { chunkText } = require("../utils/chunker");
const { getEmbedding } = require("../services/embedding.service");
const Message = require("../models/message.model");

const uploadDocument = async (req, res) => {
    try {
        const { conversationId } = req.body;

        // 1. Make sure a file was actually uploaded
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No file uploaded" });
        }

        // 2. Extract raw text from the PDF buffer
        // req.file.buffer is the PDF in memory (because we used memoryStorage in multer)
        const pdfData = await pdfParse(req.file.buffer);
        const rawText = pdfData.text;

        if (!rawText || rawText.trim().length === 0) {
            return res.status(400).json({ success: false, message: "Could not extract text from PDF" });
        }

        // 3. Split text into chunks
        const chunks = chunkText(rawText);

        // 4. For each chunk — get embedding and save to MongoDB
        const savedChunks = [];

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];

            // Call Gemini to convert this chunk into an embedding vector
            const embedding = await getEmbedding(chunk);

            // Save chunk + its embedding vector to MongoDB
            const doc = await Document.create({
                userId: req.user._id,
                conversationId,
                filename: req.file.originalname,
                chunkIndex: i,
                chunkText: chunk,
                embedding,
            });

            savedChunks.push(doc);

            await Message.create({
                conversationId,
                role: "system",
                content: `📄 Document uploaded: ${req.file.originalname}`,
            });
        }

        res.status(201).json({
            success: true,
            message: `PDF processed successfully`,
            filename: req.file.originalname,
            totalChunks: savedChunks.length,
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { uploadDocument };