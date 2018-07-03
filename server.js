require('dotenv').config();
var express     = require('express');
var nforce      = require('nforce');
var bodyParser  = require('body-parser');
var cors        = require('cors');
var app         = express();

var mongodb = require('mongodb'),
    mongoClient = mongodb.MongoClient,
    ObjectID = mongodb.ObjectID, // Used in API endpoints
    db; // We'll initialize connection below

// var org = nforce.createConnection({
//   clientId: process.env.SF_CLIENT_ID,
//   clientSecret: process.env.SF_CLIENT_SECRET,
//   redirectUri: process.env.SF_AUTH_REDIRECT_URL,
//   mode: 'single' // optional, 'single' or 'multi' user mode, multi default
// });

app.use(bodyParser.json());
app.set('port', process.env.PORT || 8080);
app.use(cors());

var MONGODB_URI = process.env.MONGODB_URI;

// Initialize database connection and then start the server.
mongoClient.connect(MONGODB_URI, { useNewUrlParser: true }, (err, client) => {
  if (err) {
    console.log(err);
    process.exit(1);
  }

  db = client.db(new URL(MONGODB_URI).pathname.replace("/", "")); // Our database object from mLab

  console.log("Database connection ready");

  // Initialize the app.
  app.listen(app.get('port'), function () {
    console.log("You're a wizard, Harry. I'm a what? Yes, a wizard, on port", app.get('port'));
  });
});

function alexaResponse(str, sessionId) {
  return {
    "version": "string",
    "sessionAttributes": {
        "key": sessionId
    },
    "response": {
            "outputSpeech": {
            "type": "PlainText",
            "text": str,
            "ssml": `<speak>${str}</speak>`
        },
        "shouldEndSession": true
    }
  }
}

function listFittingItemsRespTemplate(itemList) {
   return `here's whats you've selected today: ${itemList}`;
}

function listBasketItemsRespTemplate(itemList) {
  return itemList ? `here's whats in your basket: ${itemList}` : 'hmm, it doesn\'t look like you\'ve added anything to your basket yet';
}

function addBasketItemRespTemplate(item, size) {
  return `no problem Sarah, I've added the ${item} in a size ${size}, to your basket`;
}

function requestAssistanceRespTemplate(item, size) {
  return `ok Sarah, I've requested a size ${size} in the ${item} for you. It should be with you shortly.`;
}

// Alexa endpoints
app.post("/api/alexa", function (req, res) {
  var sessionId = req.body.session.sessionId;

  switch (req.body.request.intent.name) {
      case "ListFittingItems":
        db.collection("fittingItems").find({}).toArray(function (err, docs) {

          if (err) {
            handleError(res, err.message, "Failed to get shows");
          } else {
            var itemList = "";
            console.log("DOCS: " + docs);
            docs.forEach(item => {
                console.log("DOC: " + JSON.stringify(item));
                itemList += `the ${item.item}, in a size ${item.size}; `;
            });

            var responseObject = alexaResponse(listFittingItemsRespTemplate(itemList), sessionId);

            res.status(200).json(responseObject);
          }
        });
        return;
      case "RequestAssistance":
          var item = req.body.request.intent.slots.item.value;
          var size = req.body.request.intent.slots.size.value;

          var newRequest = {
            item: item,
            size: size
          }

          db.collection("assistanceRequest").insertOne(newRequest, function (err, doc) {

            if (err) {
              handleError(res, err.message, "Failed to add todo");
            } else {
              var responseObject = alexaResponse(requestAssistanceRespTemplate(item, size), sessionId);
              res.status(200).json(responseObject);
            }
          });
        return;
      case "AddToBasket":
          var item = req.body.request.intent.slots.item.value;
          var size = req.body.request.intent.slots.size.value;

          var basketItem = {
            item: item,
            size: size
          }

          db.collection("basketItems").insertOne(basketItem, function (err, doc) {

            if (err) {
              handleError(res, err.message, "Failed to add todo");
            } else {
              var responseObject = alexaResponse(addBasketItemRespTemplate(item, size), sessionId);
              res.status(200).json(responseObject);
            }
          });
          return;
      case "ListBasketItems":
          db.collection("basketItems").find({}).toArray(function (err, docs) {

            if (err) {
              handleError(res, err.message, "Failed to get shows");
            } else {
              var itemList = "";
              console.log("DOCS: " + docs);
              docs.forEach(item => {
                console.log("DOC: " + JSON.stringify(item));
                itemList += `${item.name}, in a size ${item.size} `;
              });

              var responseObject = alexaResponse(listBasketItemsRespTemplate(itemList), sessionId);

              res.status(200).json(responseObject);
            }
          });
          return;
  }
});

/*
 *  Endpoint for populating the "TV guide" with some options. Just post the following to http://<your_app_name>.herokuapp.com/api/tvshow
 *
 *     {
 *       "tvShow": "Legion"
 *     }
 *
*/
app.post("/api/fittingItems", function (req, res) {
  var fittingItem = { 
    item: req.body.item,
    size: req.body.size 
  }

  db.collection("fittingItems").insertOne(fittingItem, function (err, doc) {

    if (err) {
      handleError(res, err.message, "Failed to add Fitting Item");
    } else {
      res.status(201).json(doc.ops[0]);
    }
  });
});

/*
 *  Endpoint --> "/api/todos"
 *
 *  To change the todo app to the "TV guide" you can update the collection lookup from "todo" to "tvShows" 
 */

// GET: retrieve all todos
app.get("/api/todos", function(req, res) {
  db.collection("todos").find({}).toArray(function(err, docs) {
    if (err) {
      handleError(res, err.message, "Failed to get todos");
    } else {
      res.status(200).json(docs);
    }
  });
});

// POST: create a new todo
app.post("/api/todos", function(req, res) {
  var newTodo = {
    description: req.body.description,
    isComplete: false
  }

  db.collection("todos").insertOne(newTodo, function(err, doc) {
    if (err) {
      handleError(res, err.message, "Failed to add todo");
    } else {
      res.status(201).json(doc.ops[0]);
    }
  });
});


/*
 *  Endpoint "/api/todos/:id"
 */

// GET: retrieve a todo by id -- Note, not used on front-end
app.get("/api/todos/:id", function(req, res) {
  db.collection("todos").findOne({ _id: new ObjectID(req.params.id) }, function(err, doc) {
    if (err) {
      handleError(res, err.message, "Failed to get todo by _id");
    } else {
      res.status(200).json(doc);
    }
  });
});

// PUT: update a todo by id
app.put("/api/todos/:id", function(req, res) {
  var updateTodo = req.body;
  delete updateTodo._id;

  db.collection("todos").updateOne({_id: new ObjectID(req.params.id)}, updateTodo, function(err, doc) {
    if (err) {
      handleError(res, err.message, "Failed to update todo");
    } else {
      res.status(204).end();
    }
  });
});

// DELETE: delete a todo by id
app.delete("/api/todos/:id", function(req, res) {
  db.collection("todos").deleteOne({_id: new ObjectID(req.params.id)}, function(err, result) {
    if (err) {
      handleError(res, err.message, "Failed to delete todo");
    } else {
      res.status(204).end();
    }
  });
});

// Error handler for the api
function handleError(res, reason, message, code) {
  console.log("API Error: " + reason);
  res.status(code || 500).json({"Error": message});
}
