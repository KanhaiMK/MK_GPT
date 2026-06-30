const express = require("express")
const router = express.Router()

const authController = require("../controllers/auth.controller")

const passport = require("passport");
const jwt = require("jsonwebtoken");

// ─── GOOGLE ─────────────────────────────────────────────────
// Step A: redirect user to Google's login page
router.get("/google", passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
}));

// Step B: Google redirects back here after user approves
router.get("/google/callback", 
    passport.authenticate("google", { session: false, failureRedirect: "/login" }),
    (req, res) => {
        // req.user is set by passport (the user object we returned via done())
        const token = jwt.sign({ userId: req.user._id }, process.env.JWT_SECRET, { expiresIn: "3d" });
        res.cookie("token", token);
        res.redirect("/chat");
    }
);

// ─── GITHUB ─────────────────────────────────────────────────
router.get("/github", passport.authenticate("github", {
    scope: ["user:email"],
    session: false,
}));

router.get("/github/callback",
    passport.authenticate("github", { session: false, failureRedirect: "/login" }),
    (req, res) => {
        const token = jwt.sign({ userId: req.user._id }, process.env.JWT_SECRET, { expiresIn: "3d" });
        res.cookie("token", token);
        res.redirect("/chat");
    }
);

/* POST /auth/register */
router.post("/register", authController.userRegisterController)

/* POST /auth/login */
router.post("/login", authController.userLoginController)

// POST /auth/logout
router.post("/logout", authController.userLogoutController)

module.exports = router;