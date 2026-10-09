const express = require("express") ;
const app = express() ;
const PORT = process.env.PORT || 5000 ;

//Oauth2 congfigs is in the Oauth2.js file check it there 
//here we gonna manage the upcoming req from the front end , well the body usally contains the token !

app.use(express.urlencoded()) ;
app.use(express.json()) ;

app.use("api/auth/google" , require("./Oauth2")) ;

app.use( (req , res) => {
      return res.status(404).json({'message' : 'Not Found !' })
});

app.listen( PORT , () => {
      console.log(`The Server is Up and running In Port :${PORT}`)
}) ;
