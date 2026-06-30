const express = require("express")
const app=express()

const path=require("path")
const cookieParser=require("cookie-parser")

app.set('view engine', 'ejs');
app.set("views", path.join(__dirname, "views"));
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static(path.join(__dirname, '../public')));
app.use(cookieParser())

const session = require("express-session");
const passport = require("./config/passport");

const authRoutes = require("./routes/auth.routes")
const chatRoutes = require("./routes/chat.routes");
const documentRoutes = require("./routes/document.routes");
const pageRoutes = require("./routes/page.routes");

app.use("/", pageRoutes);
app.use("/auth",authRoutes)
app.use("/api/chat", chatRoutes);
app.use("/api/documents", documentRoutes);

app.use(session({
    secret: process.env.SESSION_SECRET || "temporary_secret_change_this",
    resave: false,
    saveUninitialized: false,
}));
app.use(passport.initialize());

module.exports = app