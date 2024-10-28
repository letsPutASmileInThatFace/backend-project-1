const mongoose = require("mongoose");
const { PASS_LENGTH, HTTP_CODES } = require("../../config/Enum");
const CustomError = require("../../lib/Error");
const is = require("is_js");
const schema = mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    is_active: { type: Boolean, default: true },
    first_name: String,
    last_name: String,
    phone_number: String,
    language: { type: String, default: "EN" },
  },
  {
    versionKey: false,
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

class Users extends mongoose.model {
  static validateFieldsBeforeAuth(email, password) {
    if (
      typeof password !== "string" ||
      password.length < PASS_LENGTH ||
      !is.email(email)
    ) {
      throw new CustomError(
        HTTP_CODES.BAD_REQUEST,
        "Validation Error",
        "Email or password is wrong"
      );
    }

    return true;
  }
}

schema.loadClass(Users);
module.exports = mongoose.model("users", schema);
