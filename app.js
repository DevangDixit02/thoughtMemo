const express = require("express");
const userModel = require("./models/user");
const postModel = require("./models/post");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = express();
const path = require('path');
const crypto = require('crypto');
const upload = require("./config/multerconfig.js");
app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname,"public")))
app.use(cookieParser());


const SECRET_KEY = process.env.SECRET_KEY || "Shhhh";

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/profile", isLoggedin, async (req, res) => {
  try {
    let user = await userModel
      .findOne({ email: req.user.email })
      .populate("post");
    res.render("profile", { user });
  } catch (error) {
    res.status(500).send("Server Error");
  }
});

app.get("/like/:id", isLoggedin, async (req, res) => {
  try {
    let post = await postModel.findById(req.params.id).populate("user");

    if (!post) {
      return res.status(404).send("Post not found");
    }

    if (post.likes.includes(req.user.userid)) {
      post.likes.pull(req.user.userid);
    } else {
      post.likes.push(req.user.userid);
    }

    await post.save();
    res.redirect("/profile");
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
});



app.get("/edit/:id", isLoggedin, async (req, res) => {
  
    let post = await postModel.findById(req.params.id).populate("user");
    res.render("edit",{post})
  } 
);

app.post("/update/:id", isLoggedin, async (req, res) => {
  let post = await postModel.findOneAndUpdate({_id:req.params.id},{content:req.body.content})
  res.redirect("/profile");
});

app.post("/post", isLoggedin, async (req, res) => {
  try {
    let user = await userModel.findOne({ email: req.user.email });
    let { content } = req.body;
    let post = await postModel.create({ user: user._id, content });
    user.post.push(post._id);
    await user.save();
    res.redirect("/profile");
  } catch (error) {
    res.status(500).send("Server Error");
  }
});

app.get("/logout", (req, res) => {
  res.cookie("token", "", { expires: new Date(0) });
  res.redirect("/login");
});


app.get("/profile/upload", (req, res) => {
   res.render("profileupload")
});

app.post("/upload", isLoggedin, upload.single("image"), async (req, res) => {
  let user = await userModel.findOne({email:req.user.email})
  user.profilepic = req.file.filename;
  await user.save()
  res.redirect("/profile")
});

app.post("/register", async (req, res) => {
  let { email, password, username, age, name } = req.body;
  try {
    let user = await userModel.findOne({ email });
    if (user) return res.status(400).send("User Already Exists");

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    user = await userModel.create({
      name,
      age,
      username,
      email,
      password: hash,
    });

    const token = jwt.sign({ email: email, userid: user._id }, SECRET_KEY);
    res.cookie("token", token);
    res.send("Registered");
  } catch (error) {
    res.status(500).send("Server Error");
  }
});


app.post("/login", async (req, res) => {
  let { email, password } = req.body;
  try {
    let user = await userModel.findOne({ email });
    if (!user) return res.status(400).send("User not found");

    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {
      const token = jwt.sign({ email: email, userid: user._id }, SECRET_KEY);
      res.cookie("token", token);
      res.status(200).redirect("/profile");
    } else {
      res.status(400).send("Invalid Credentials");
    }
  } catch (error) {
    res.status(500).send("Server Error");
  }
});

function isLoggedin(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.redirect("/login");
  try {
    const data = jwt.verify(token, SECRET_KEY);
    req.user = data;
    next();
  } catch {
    res.redirect("/login");
  }
}

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
