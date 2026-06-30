const express = require("express");
const router = express.Router();
const { authmiddleware } = require("../middlewares/auth.middleware");

router.get("/", (req, res) => res.redirect("/login"));
router.get("/login", (req, res) => res.render("login"));
router.get("/register", (req, res) => res.render("register"));
router.get("/chat", authmiddleware, (req, res) => res.render("chat"));

module.exports = router;