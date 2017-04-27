var https = require("https");
var querystring = require("querystring")
var express = require('express');
var request = require("request");
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  var twitterCredentials = {
    client_secret: "oGPq7yFiQra3dalWhRVLCQqG8uSOU6ph5K7QkR7PwcPWBv6Acf",
    client_key: "fQvegTfFmorukqnxS1ltpdoPz"
  }
  var combinedCredentials = twitterCredentials.client_key + ":" + twitterCredentials.client_secret;
  var encoded = new Buffer(combinedCredentials).toString("base64");
  request.post({
    url:"https://api.twitter.com/oauth2/token",
    headers: {
      "Authorization": "Basic " + encoded,
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
    },
    form: {
      "grant_type": "client_credentials"
    }
  }, function(err, response, body){
    res.cookie("twitter_token", JSON.parse(body).access_token);
    res.render('index', { title:"Hashtag Search", data:[] });
  })
});

router.get("/oauth/callback",function(req, res, next) {
  if(req.query.provider === "instagram"){
    var options = {
      url: "https://api.instagram.com/oauth/access_token",
      form:{
        client_id: "d75c45e7a8de451cb38ba8c027909c66",
        client_secret: "2a480c56a6f24b5f9c186927f9bad838",
        grant_type: "authorization_code",
        redirect_uri: "http://localhost:3000/oauth/callback?provider=instagram",
        code: req.query.code
      }
    };
    request.post(options, function(err,response,body){
      console.log(body)
      res.cookie("access_token", JSON.parse(body).access_token)
      res.redirect("/")
    });
  }

});

router.post("/", function(req, res, next) {
  var query = encodeURIComponent(req.body.search);
  var token = req.cookies.access_token;
  var twitter_token = req.cookies.twitter_token;
  var posts = [];
  request.get({
    url:"https://api.twitter.com/1.1/search/tweets.json?q=%23" + query,
    headers:{
      "Authorization": "Bearer "+ twitter_token
    }
  }, function(err,response,body){
    var twitterPosts = JSON.parse(body).statuses.map(function(element, i){

      var post = {
        imageURL:element.entities.media ? element.entities.media[0].media_url : "",
        username: element.user.screen_name,
        profileURL: element.user.profile_image_url,
        caption: element.text,
        created: new Date(element.created_at),
        source: 'twitter'
      }
      return post;
    })
    console.log(twitterPosts)
    posts = posts.concat(twitterPosts);
    if(!token){
      res.render("index", {title:"Hashtag Search", data: posts});
    }else{
      request.get({
        url:"https://api.instagram.com/v1/tags/"+ query + "/media/recent?access_token=" + token + "&count=50"
      },  function(err,response,body){
        var instagramPosts = JSON.parse(body).data.map(function(element, i){
          var post = {
            imageURL:element.images.standard_resolution.url,
            username: element.user.username,
            profileURL: element.user.profile_picture,
            caption: element.caption.text,
            created: new Date(parseInt(element.created_time)),
            source: 'instagram'
          }
          return post
        });
        posts = posts.concat(instagramPosts);
        res.render("index", {title:"Hashtag Search", data: posts});
      })

    }

  })

});
module.exports = router;
