const mongoose = require("mongoose")

const convoSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: [true, "Conversation must be associated with a user"],
        index: true
    },
    title: {
        type: String,
        default: "New Conversation"
    }
}, { timestamps: true })

const conversationModel = mongoose.model("conversation", convoSchema)
module.exports = conversationModel