const express = require("express");
const router = express.Router();
const { authmiddleware } = require("../middlewares/auth.middleware");
const {
    createConversation,
    getConversations,
    getMessages,
    sendMessage,
    sendMessageStream,
    deleteConversation,
    updateConversationTitle
} = require("../controllers/chat.controller");

// All chat routes require login
router.use(authmiddleware);

router.post("/conversation", createConversation);
router.get("/conversations", getConversations);
router.get("/conversation/:id/messages", getMessages);
router.post("/conversation/:id/message", sendMessage);
router.post("/conversation/:id/message/stream", sendMessageStream);
router.delete("/conversation/:id", deleteConversation);
router.put("/conversation/:id/title", updateConversationTitle);

module.exports = router;