var express = require('express')
  , app = express()
  , fs = require('fs')
  , path = require('path')
  , server = require("http").createServer(app)
  , io = require('socket.io').listen(server)
  , arDrone = require('ar-drone')
  , arDroneConstants = require('ar-drone/lib/constants')
  ;

//var twitterAPI = require('node-twitter-api');
//var twitter = new twitterAPI({
//    consumerKey: 'U8c00P1RXAbt3BYokrw5nQ',
//    consumerSecret: '4POnzXJ8BqaGTYwZsg5bEGfp5gSpc2xjPUMGux2Dg',
//    callback: 'http://lvh.me:3000/'
//});
//
//twitter.getRequestToken(function(error, requestToken, requestTokenSecret, results){
//    if (error) {
//        console.log("Error getting OAuth request token : " + error);
//    } else {
//        //store token and tokenSecret somewhere, you'll need them later; redirect user
//        var twitterRequestToken = requestToken,
//            twitterRequestTokenSecret = requestTokenSecret;
//        tweet();
//    }
//});
//
////twitter.getAccessToken(twitterRequestToken, twitterRequestTokenSecret, oauth_verifier, function(error, accessToken, accessTokenSecret, results) {
////    if (error) {
////        console.log(error);
////    } else {
////        //store accessToken and accessTokenSecret somewhere (associated to the user)
////        //Step 4: Verify Credentials belongs here
////    }
////});
//
//
//
//function tweet(){
//  var filePath = "public/cheese/cheese.png";
//  var image = fs.createReadStream(path.normalize(filePath));
//  twitter.statuses("update_with_media", {
//          'status': "Drone tweet with image!",
//          'media[]': image
//      },
//      "213361412-2l7VFcKUGxtRwymzsrudzpvSnDZ1stGTRDcfYZe6",
//      "P14t4pUyLaCLAaY4KCh8j0pTzJXwmRL7Q83ayON172xf9",
//      function(error, data, response) {
//          if (error) {
//              // something went wrong
//              console.log(error);
//              console.log("tweet wrong");
//          } else {
//              // data contains the data sent by twitter
//              console.log("tweet success");
//          }
//      }
//  );  
//}






// Fetch configuration
try {
    var config = require('./config');
} catch (err) {
    console.log("Missing or corrupted config file. Have a look at config.js.example if you need an example.");
    process.exit(-1);
}
  

// Override the drone ip using an environment variable,
// using the same convention as node-ar-drone
var drone_ip = process.env.DEFAULT_DRONE_IP || '192.168.1.1';

// Keep track of plugins js and css to load them in the view
var scripts = []
  , styles = []
  ;

app.configure(function () {
    app.set('port', process.env.PORT || 3000);
    app.set('views', __dirname + '/views');
    app.set('view engine', 'ejs', { pretty: true });
    app.use(express.favicon());
    app.use(express.logger('dev'));
    app.use(app.router);
    app.use(express.static(path.join(__dirname, 'public')));
    app.use("/components", express.static(path.join(__dirname, 'bower_components')));
});

app.configure('development', function () {
    app.use(express.errorHandler());
    app.locals.pretty = true;
});

app.get('/', function (req, res) {
    res.render('index', {
        title: 'Express'
        ,scripts: scripts
        ,styles: styles
        ,options: {
          keyboard: config.keyboard
        }
    });
});

function navdata_option_mask(c) {
  return 1 << c;
}

// From the SDK.
var navdata_options = (
    navdata_option_mask(arDroneConstants.options.DEMO) 
  | navdata_option_mask(arDroneConstants.options.VISION_DETECT)
  | navdata_option_mask(arDroneConstants.options.MAGNETO)
  | navdata_option_mask(arDroneConstants.options.WIFI)
);

// Connect and configure the drone
var client = new arDrone.createClient({timeout:4000});
client.config('general:navdata_demo', 'TRUE');
client.config('video:video_channel', '0');
client.config('general:navdata_options', navdata_options);

// Add a handler on navdata updates
var latestNavData;
client.on('navdata', function (d) {
    latestNavData = d;
});

// Signal landed and flying events.
client.on('landing', function () {
  console.log('LANDING');
  io.sockets.emit('landing');
});
client.on('landed', function () {
  console.log('LANDED');
  io.sockets.emit('landed');
});
client.on('takeoff', function() {
  console.log('TAKEOFF');
  io.sockets.emit('takeoff');
});
client.on('hovering', function() {
  console.log('HOVERING');
  io.sockets.emit('hovering');
});
client.on('flying', function() {
  console.log('FLYING');
  io.sockets.emit('flying');
});

var clientSocket;

// Process new websocket connection
io.set('log level', 1);
io.sockets.on('connection', function (socket) {

  clientSocket = socket;

  socket.emit('event', { message: 'Welcome to cockpit :-)' });

  //Take Picture
  socket.on('cheese', function () {
    console.log('cheese');
    setTimeout(function() {
      //console.log(client.getVideoStream());
//
      //client.getVideoStream().once('data', function(buffer){
      //  console.log(buffer);
      //  var fileName = '/cheese/boom.png';
      //  fs.writeFile('public' + fileName, buffer, function(err){
      //      if (err) console.log(err);
      //      //socket.emit('updateCheese', fileName);
      //  });
      //})

      client.getPngStream().once('data', function(data) {
        var fileName = '/cheese/cheese.png';
        console.log(data);
        fs.writeFile('public' + fileName, data, function(err){
            if (err) console.log(err);
            socket.emit('updateCheese', fileName);
        });
      });
    }, 100);
  });

});

io.on('serverCheese', function(){
  console.log('server-cheese');
  takePicture();
});

io.on('serverTweet', function(){
  console.log('server-tweet');
  tweetPicture();
});

var takePicture = function() {
  console.log('cheese');
  console.log(client.getPngStream());
  setTimeout(function() {
    client.getPngStream().once('data', function(data) {
      var fileName = '/cheese/cheese.png';
      console.log(data);
      fs.writeFile('public' + fileName, data, function(err){
          if (err) console.log(err);
          clientSocket.emit('updateCheese', fileName);
      });
      var timeStamp = new Date().getTime();
      fs.writeFile('public/cheese/cheese_' + timeStamp + '.png', data, function(err){
          if (err) console.log(err);
      });
    });
  }, 100);
};

var tweetPicture = function() {
  console.log('tweet picture');
};


// Schedule a time to push navdata updates
var pushNavData = function() {
    io.sockets.emit('navdata', latestNavData);
};
var navTimer = setInterval(pushNavData, 100);

// Prepare dependency map for plugins
var deps = {
    server: server
  , app: app
  , io: io
  , client: client
  , config: config
};

//Load Gamepad
//var gamepad = require("drone-ps3-controller")(io);

// Load the plugins
var dir = path.join(__dirname, 'plugins');
function getFilter(ext) {
    return function(filename) {
        return filename.match(new RegExp('\\.' + ext + '$', 'i'));
    };
}

config.plugins.forEach(function (plugin) {
    console.log("Loading " + plugin + " plugin.");

    // Load the backend code
    require(path.join(dir, plugin))(plugin, deps);

    // Add the public assets to a static route
    if (fs.existsSync(assets = path.join(dir, plugin, 'public'))) {
      app.use("/plugin/" + plugin, express.static(assets));
    }

    // Add the js to the view
    if (fs.existsSync(js = path.join(assets, 'js'))) {
        fs.readdirSync(js).filter(getFilter('js')).forEach(function(script) {
            scripts.push("/plugin/" + plugin + "/js/" + script);
        });
    }

    // Add the css to the view
    if (fs.existsSync(css = path.join(assets, 'css'))) {
        fs.readdirSync(css).filter(getFilter('css')).forEach(function(style) {
            styles.push("/plugin/" + plugin + "/css/" + style);
        });
    }
});

// Start the web server
server.listen(app.get('port'), function() {
  console.log('AR. Drone WebFlight is listening on port ' + app.get('port'));
});

