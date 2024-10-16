const mongoose = require("mongoose");

const schema = mongoose.Schema(
  {
    isActive: { type: Boolean, default: true },
    created_by: {
      type: mongoose.SchemaTypes.ObjectId,
      required: true,
    },
  },
  {
    versionKey: false,
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

class Categories extends mongoose.model {}

schema.loadClass(Categories);
module.exports = mongoose.model("categories", schema);
