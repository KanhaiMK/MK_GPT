const mongoose = require("mongoose")

const documentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: [true, "Document must be associated with a user"],
        index: true
    },
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "conversation",
        required: [true, "Document must be associated with a conversation"],
        index: true
    },
    filename: {
        type: String,
        required: [true, "Filename is required"]
    },
    chunkIndex: {
        type: Number,
        required: [true, "Chunk index is required"]
    },
    chunkText: {
        type: String,
        required: [true, "Chunk text is required"]
    },
    embedding: {
        type: [Number],
        required: [true, "Embedding is required"]
    }
}, { timestamps: true })

const documentModel = mongoose.model("document", documentSchema)
module.exports = documentModel