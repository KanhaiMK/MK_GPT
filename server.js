require("dotenv").config()
process.on('uncaughtException', (err) => {
    console.log("CAUGHT:", err.message)
    console.log("FILE:", err.stack)
})

const app = require("./src/app")

const connectToDB = require("./src/config/db")
connectToDB()

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})