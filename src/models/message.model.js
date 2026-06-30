const mongoose = require("mongoose")

const msgSchema = new mongoose.Schema({
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "conversation",
        required: [true, "Message must be associated with a conversation"],
        index: true
    },
    role: {
        type: String,
        enum: ["user", "assistant", "system"],
        required: [true, "Role is required"]
    },
    content: {
        type: String,
        required: [true, "Content is required"]
    }
}, { timestamps: true })

const messageModel = mongoose.model("message", msgSchema)
module.exports = messageModel