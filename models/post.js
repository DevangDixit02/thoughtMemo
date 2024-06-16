const mongoose = require("mongoose");

const postSchema = mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    content: String,
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
    content:String,
    
  },
  
  { timestamps: true }
);

module.exports = mongoose.model("post", postSchema);
