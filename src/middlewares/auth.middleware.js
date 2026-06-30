const userModel = require("../models/user.model")
const jwt = require("jsonwebtoken")

async function authmiddleware(req, res, next) {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1]

    if (!token) {
        if (req.accepts("html")) {
            return res.redirect("/login")
        }
        return res.status(401).json({ success: false, message: "Unauthorized" })
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        const user = await userModel.findById(decoded.userId)
        req.user = user
        return next()
    }
    catch (err) {
        if (req.accepts("html")) {
            return res.redirect("/login")
        }
        return res.status(401).json({ success: false, message: "Unauthorized" })
    }
}

module.exports = {
    authmiddleware
}