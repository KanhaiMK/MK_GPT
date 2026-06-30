const express = require("express");
const router = express.Router();
const { authmiddleware } = require("../middlewares/auth.middleware");
const upload = require("../config/multer");
const { uploadDocument } = require("../controllers/document.controller");

router.use(authmiddleware);

// upload.single("pdf") tells multer to expect one file under the field name "pdf"
router.post("/upload", upload.single("pdf"), uploadDocument);

module.exports = router;