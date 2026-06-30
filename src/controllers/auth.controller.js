const { compare } = require("bcrypt")
const userModel = require("../models/user.model")
const jwt = require("jsonwebtoken")

async function userRegisterController(req,res) {
    const {email, name, password} = req.body

    const isExist = await userModel.findOne({email})
    if(isExist) {
        return res.status(422).json({
            message: "Email already exits"
        })
    }
    
    const user = await userModel.create({
        email, name, password
    })

    const token = jwt.sign({userId: user._id}, process.env.JWT_SECRET, {expiresIn: "3d"})

    res.cookie("token", token)

    // return res.status(201).redirect('/register?success=true')
    return res.status(201).json({ success: true, message: "Registered successfully" })
}

async function userLoginController(req,res) {
    const {email, password} = req.body

    const user = await userModel.findOne({email}).select("+password")

    if(!user) {
        // return res.status(401).redirect("/login?error=user_not_found")
        return res.status(401).json({
            message: "User not found"
        })
    }

    const isValidPassword = await user.comparePassword(password)
    if(!isValidPassword) {
        // return res.status(401).redirect("/login?error=wrong_password")
        return res.status(401).json({
            message:"Password not matched"
        })
    }

    const token = jwt.sign({userId: user._id}, process.env.JWT_SECRET, {expiresIn: "3d"})
    res.cookie("token", token)

    return res.status(200).json({ success: true, message: "Logged in successfully" })
}

async function userLogoutController(req,res) {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1]

    if(!token) {
        // return res.status(200).redirect("/login")
        return res.status(200).json({
            message: "Logged-out"
        })
    }

    res.cookie("token", "")
    res.clearCookie("token")

    return res.status(200).json({
        message: "Logged-out"
    })
}

module.exports = {
    userRegisterController,
    userLoginController,
    userLogoutController
}