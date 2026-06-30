const multer = require("multer");

// storage: memoryStorage means the file is kept in RAM as a Buffer
// instead of being saved to disk — we just need to read it, not store it
const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    fileFilter: (req, file, cb) => {
        if (file.mimetype === "application/pdf") {
            cb(null, true);
        } else {
            cb(new Error("Only PDF files are allowed"), false);
        }
    },
});

module.exports = upload;