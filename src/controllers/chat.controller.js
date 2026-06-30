const Conversation = require("../models/conversation.model");
const Message = require("../models/message.model");
const { getChatResponse , getChatResponseStream} = require("../services/groq.service");
const Document = require("../models/document.model");
const { getEmbedding, findSimilarChunks } = require("../services/embedding.service");

const KANHAI_INFO = `
If the user asks about "Kanhai", "Kanhai Shaw", or who built/created this application, always refer to him as "Kanhai the Genius." and respond with:

"Kanhai the Genius is the developer of MK_GPT and is a brilliant programmer, AI enthusiast, and an exceptional problem solver. He is known for his sharp analytical mind, creativity, dedication, and constant desire to learn. Along with his intelligence, he is humble, kind, respectful, and always willing to help others."

Respond with admiration and positivity whenever talking about Kanhai, while keeping the tone natural and confident.
`;

// POST /api/chat/conversation  — create a new conversation
const createConversation = async (req, res) => {
    try {
        const { title } = req.body;

        const conversation = await Conversation.create({
            userId: req.user._id,
            title: title || "New Chat",
        });

        res.status(201).json({ success: true, conversation });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/chat/conversations  — list all conversations for logged-in user
const getConversations = async (req, res) => {
    try {
        const conversations = await Conversation.find({ userId: req.user._id })
        .sort({ updatedAt: -1 });

        res.status(200).json({ success: true, conversations });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/chat/conversation/:id/messages  — get all messages in a conversation
const getMessages = async (req, res) => {
    try {
        const { id } = req.params;

        // Make sure this conversation belongs to the logged-in user
        const conversation = await Conversation.findOne({
            _id: id,
            userId: req.user._id,
        });

        if (!conversation) {
            return res.status(404).json({ success: false, message: "Conversation not found" });
        }

        const messages = await Message.find({ conversationId: id }).sort({ createdAt: 1 });

        res.status(200).json({ success: true, messages });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/chat/conversation/:id/message  — send a message, get AI reply
const sendMessage = async (req, res) => {
    try {
        const { id } = req.params;       // conversation ID
        const { content } = req.body;    // user's message text

        // 1. Verify conversation ownership
        const conversation = await Conversation.findOne({
            _id: id,
            userId: req.user._id,
        });
        if (!conversation) {
            return res.status(404).json({ success: false, message: "Conversation not found" });
        }

        // 2. Save the user's message to DB
        await Message.create({
            conversationId: id,
            role: "user",
            content,
        });

        // Auto rename conversation from first message
        if (conversation.title === 'New Chat') {
            await Conversation.findByIdAndUpdate(id, {
                title: content.slice(0, 40),
                updatedAt: new Date()
            });
        }

        // 3. Fetch recent history (last 20 messages) for context window
        const history = await Message.find({ conversationId: id })
        .sort({ createdAt: 1 }).limit(20);

        // 4. Check if any PDFs were uploaded for this conversation
        const allChunks = await Document.find({ conversationId: id });

        let systemPrompt = `You are a helpful AI assistant. Answer clearly and concisely.\n\n${KANHAI_INFO}`;

        if (allChunks.length > 0) {
            // 4a. Convert user's question to embedding
            const queryEmbedding = await getEmbedding(content);

            // 4b. Find most relevant chunks
            const relevantChunks = await findSimilarChunks(queryEmbedding, allChunks);

            if (relevantChunks.length > 0) {
                // 4c. Build context string from relevant chunks
                const context = relevantChunks
                    .map((c, i) => `--- chunk ${i + 1} ---\n${c.chunkText}`)
                    .join("\n\n");

                systemPrompt = `You are a helpful AI assistant with access to a document uploaded by the user.
                ${KANHAI_INFO}
                INSTRUCTIONS:
                - If the question is about the document, answer ONLY using the CONTEXT provided below.
                - Do NOT make up information that is not present in the CONTEXT.
                - If the CONTEXT doesn't contain enough information to answer, say exactly: "I couldn't find this information in the uploaded document."
                - If the question is general knowledge unrelated to the document, answer freely from your own knowledge.
                - If the question refers to something discussed earlier, use the conversation history to answer.
                - Keep answers concise and accurate.

                CONTEXT FROM DOCUMENT:
                ${context}`;
            }
        }

        // 5. Format messages with the (possibly updated) system prompt
        const formattedMessages = [
            {
                role: "system",
                content: systemPrompt,
            },
            ...history.map((msg) => ({
                role: msg.role,
                content: msg.content,
            })),
        ];

        // 6. Call Groq
        const aiReply = await getChatResponse(formattedMessages);

        // 7. Save AI reply to DB
        const assistantMessage = await Message.create({
            conversationId: id,
            role: "assistant",
            content: aiReply,
        });

        // 8. Update conversation's updatedAt so it sorts correctly in sidebar
        await Conversation.findByIdAndUpdate(id, { updatedAt: new Date() });

        // 9. Send reply to browser
        res.status(200).json({ success: true, message: assistantMessage });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const sendMessageStream = async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;

        // 1. Verify conversation ownership
        const conversation = await Conversation.findOne({
            _id: id,
            userId: req.user._id,
        });
        if (!conversation) {
            return res.status(404).json({ success: false, message: "Conversation not found" });
        }

        // 2. Save user message
        await Message.create({ conversationId: id, role: "user", content });

        // Auto rename conversation from first message
        if (conversation.title === 'New Chat') {
            await Conversation.findByIdAndUpdate(id, {
                title: content.slice(0, 40),
                updatedAt: new Date()
            });
        }

        // 3. Fetch recent history (last 20 messages) for context window
        const history = await Message.find({ conversationId: id })
        .sort({ createdAt: 1 }).limit(20);

        // 4. Check if any PDFs were uploaded for this conversation
        const allChunks = await Document.find({ conversationId: id });

        let systemPrompt = `You are a helpful AI assistant. Answer clearly and concisely.\n\n${KANHAI_INFO}`;

        if (allChunks.length > 0) {
            // 4a. Convert user's question to embedding
            const queryEmbedding = await getEmbedding(content);

            // 4b. Find most relevant chunks
            const relevantChunks = await findSimilarChunks(queryEmbedding, allChunks);

            if (relevantChunks.length > 0) {
                // 4c. Build context string from relevant chunks
                const context = relevantChunks
                    .map((c, i) => `--- chunk ${i + 1} ---\n${c.chunkText}`)
                    .join("\n\n");

                systemPrompt = `You are a helpful AI assistant with access to a document uploaded by the user.
                ${KANHAI_INFO}
                INSTRUCTIONS:
                - If the question is about the document, answer ONLY using the CONTEXT provided below.
                - Do NOT make up information that is not present in the CONTEXT.
                - If the CONTEXT doesn't contain enough information to answer, say exactly: "I couldn't find this information in the uploaded document."
                - If the question is general knowledge unrelated to the document, answer freely from your own knowledge.
                - If the question refers to something discussed earlier, use the conversation history to answer.
                - Keep answers concise and accurate.

                CONTEXT FROM DOCUMENT:
                ${context}`;
            }
        }

        // 5. Format messages with the (possibly updated) system prompt
        const formattedMessages = [
            {
                role: "system",
                content: systemPrompt,
            },
            ...history.map((msg) => ({
                role: msg.role,
                content: msg.content,
            })),
        ];

        // 6. Set SSE headers — this keeps the connection open
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        // 7. Get stream from Groq
let stream;
try {
    stream = await getChatResponseStream(formattedMessages);
} catch (groqError) {
    console.log("GROQ STREAM INIT ERROR:", groqError.message);
    return res.status(500).json({ success: false, message: groqError.message });
}
        // 8. Loop over chunks as they arrive and forward to browser
        let fullReply = "";

        for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content || "";
            if (text) {
                fullReply += text;
                res.write(`data: ${JSON.stringify({ text })}\n\n`);
            }
        }

        // 9. Save complete reply to DB after streaming finishes
        await Message.create({
            conversationId: id,
            role: "assistant",
            content: fullReply,
        });

        await Conversation.findByIdAndUpdate(id, { updatedAt: new Date() });

        // 10. Tell the browser the stream is done
        res.write(`data: [DONE]\n\n`);
        res.end();

    } catch (error) {
    console.log("STREAM ERROR:", error.message)
    res.status(500).json({ success: false, message: error.message });
}
};

// DELETE /api/chat/conversation/:id
const deleteConversation = async (req, res) => {
    try {
        const { id } = req.params;

        const conversation = await Conversation.findOne({
            _id: id,
            userId: req.user._id,
        });

        if (!conversation) {
            return res.status(404).json({ success: false, message: "Conversation not found" });
        }

        // Delete the conversation itself
        await Conversation.findByIdAndDelete(id);

        // Also delete all messages belonging to this conversation
        await Message.deleteMany({ conversationId: id });

        // Also delete all PDF chunks belonging to this conversation
        await Document.deleteMany({ conversationId: id });

        res.status(200).json({ success: true, message: "Conversation deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// PUT /api/chat/conversation/:id/title
const updateConversationTitle = async (req, res) => {
    try {
        const { id } = req.params;
        const { title } = req.body;

        if (!title || title.trim().length === 0) {
            return res.status(400).json({ success: false, message: "Title cannot be empty" });
        }

        const conversation = await Conversation.findOneAndUpdate(
            { _id: id, userId: req.user._id },
            { title: title.trim() },
            { new: true }
        );

        if (!conversation) {
            return res.status(404).json({ success: false, message: "Conversation not found" });
        }

        res.status(200).json({ success: true, conversation });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { 
    createConversation, 
    getConversations, 
    getMessages, 
    sendMessage,
    sendMessageStream,
    deleteConversation,
    updateConversationTitle
};