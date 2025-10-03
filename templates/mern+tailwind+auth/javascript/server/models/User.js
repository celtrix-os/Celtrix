const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { 
      type: String, 
      required: true, 
      minlength: 8,
      validate: {
        validator: function (value) {
          return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?#&_])[A-Za-z\d@$!%*?#&_]{8,}$/.test(value);
        },
        message:
          "Please enter a strong password.",
      },
    },
   },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema); // ✅ CommonJS export
