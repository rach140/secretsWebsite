
require("dotenv").config();
const express=require("express");
const bodyParser=require("body-parser");
const ejs=require("ejs");
const mongoose=require("mongoose");
const url="mongodb://localhost:27017/userDB";
const session=require("express-session");
var bcrypt = require('bcrypt');
const saltRounds = 10;
const nodemailer = require("nodemailer");

const app=express();


app.use(express.static("public"));
app.set("view engine","ejs");
app.use(bodyParser.urlencoded({
  extended:true
}));

app.use(session({
  secret:"icanttellyou",
  resave:false,
  saveUninitialized:false
}));



mongoose.connect(url,{useUnifiedtopology:true}).then(function(ans){
  console.log("Successfully connected to the database server");
});

let transporter = nodemailer.createTransport({
  service:'gmail',

auth: {
  user:process.env.AUTH_EMAIL, // generated ethereal user
  pass:process.env.AUTH_PASS, // generated ethereal password
},
});
const userSchema=new mongoose.Schema({
  username:String,
  password:String,
  secret:String,
  verified:Boolean
});

const userProfileSchema=new mongoose.Schema({
  firstName:String,
  lastName:String,
  userName:String,
  email:String
});

const User=mongoose.model("User",userSchema);

const UserProfile=mongoose.model("UserProfile",userProfileSchema);



app.get("/",function(req,res){
  res.render("home");
});

app.get("/register",function(req,res){
  res.render("register");
});

app.get("/login",function(req,res){
  res.render("login");
});

app.get("/secrets",function(req,res){



  res.render("secrets");

});




app.get("/logout",function(req,res){

  res.redirect("/");
});

app.get("/updateProfile",function(req,res){


    res.render("updateProfile");

});

app.get("/submit",function(req,res){


    res.render("submit");

});

app.post("/register",function(req,res){

    bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
    // Store hash in your password DB.
    const newUser=new User({
     username:req.body.username,
       password:hash,
       verified:false,
    });
    newUser.save().then((result)=>{
      res.render("secrets");
    })

})

});


app.post("/login",function(req,res){

 User.findOne({username:req.body.username},function(err,foundUser){
   if(err){
     console.log(err);
   }else{
     if(foundUser){
       bcrypt.compare(req.body.password, foundUser.password, function(err, result) {
         if(result===true){
           res.render("secrets");
         }
       });
     }
   }
 });



});

app.post("/updateProfile",function(req,res){



 UserProfile.find({email:req.body.email}, function (err, docs) {
    if (err){
        console.log(err);

    }
    else{
        const userNewProfile=new UserProfile({
          firstName:req.body.firstName,
          lastName:req.body.lastName,
          userName:req.body.username,
          email:req.body.email,
        });

        userNewProfile.save(function(){
          res.redirect("/secrets");
        });
    }
});

});

app.post("/submit",function(req,res){
  const submittedSecret=req.body.secret;


 User.findById(req.user._id,function(err,docs){
   if(err){
     console.log(err);
   }else{
     if(docs){
       docs.secret=submittedSecret;
       docs.save(function(){
        res.redirect("/secrets");
       });
     }
   }
 });

});


const sendOTPVerificationEmail=async ({_id,username},res)=>{
  try{
    const otp='${Math.floor(1000+Math.random()*9000)}';
    //mail options
   const mailOptions={
     from:process.env.AUTH_EMAIL,
     to:username,
     subject:"Verify your Email",
     html:'<p>Enter <b>${otp}</b> in the app to verify your email address and complete the verification.</p><p>This code <b>expires in 1 hour</b>.</p>',
   };
   //hash the otp
   const saltRounds=10;
   const hashedOTP=await bcrypt.hash(otp,saltRounds);
   const newOTPVerification=await new UserOTPVerification({
     userId:_id,
     otp:hashedOTP,
     createdAt:Date.now(),
     expiresAt:Date.now()+360000,
   });

   //save otp record
   await newOTPVerification.save();
   await transporter.sendMail(mailOptions);

  }catch(error){
   console.log("Error");
  }
}

app.listen(3000,function(){
  console.log("Server connected to port 3000");
});
