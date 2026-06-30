const mongoose = require("mongoose")
const bcrypt = require("bcrypt")

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        select: false,
        required: function() {
            // Password only required if user signed up normally (not via OAuth)
            return !this.googleId && !this.githubId;
        }
    },
    googleId: {
        type: String,
        default: null
    },
    githubId: {
        type: String,
        default: null
    },
}, { timestamps: true })

userSchema.pre("save", async function() {
    if(!this.isModified("password") || !this.password) {
        return;
    }
    const hash = await bcrypt.hash(this.password,10);
    this.password=hash
    return
})

userSchema.methods.comparePassword = async function(password) {
    return await bcrypt.compare(password, this.password)
}

const userModel = mongoose.model("user", userSchema);
module.exports = userModel