const express = require("express");
const bodyParser = require("body-parser");
const logger = require("./winston");
const validator = require("./validator");
const AppError = require("./model/application-error");

const argv = require("yargs").argv;
const npid = require("npid");

const app = express();
const port = process.env.PORT || 3020;

app.use(bodyParser.json());

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use(function(err, req, res, next) {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    let appError = new AppError("Received malformed JSON.");
    logger.log("info", appError.error);
    res.status(400).send(appError);
  } else {
    let appError = new AppError(err.message);
    logger.log("error", appError.error);
    res.status(err.status).send(appError);
  }
});

app.post("/validate", (req, res) => {
  logger.log("debug", "Received POST request.");

  var inputSchema = req.body.schema;
  var inputObject = req.body.object;

  if (inputSchema && inputObject) {
    validator.runValidation(inputSchema, inputObject).then((output) => {
      logger.log("silly", "Sent validation results.");
      res.status(200).send(output);
    }).catch((error) => {
      res.status(500).send(error);
    });
  } else {
    let appError = new AppError("Something is missing, both schema and object are required to execute validation.");
    logger.log("info", appError.error);
    res.status(400).send(appError);
  }
});

app.post("/autovalidate", (req, res) => {
  logger.log("debug", "Received POST request.");
  var inputObject = req.body.object;

  if (inputObject) {
    validator.runAutoValidation(inputObject).then((output) => {
      logger.log("silly", "Sent validation results.");
      res.status(200).send(output);
    }).catch((error) => {
      res.status(500).send(error);
    });
  } else {
    let appError = new AppError("Something is missing, both schema and object are required to execute validation.");
    logger.log("info", appError.error);
    res.status(400).send(appError);
  }
});

app.get("/validate", (req, res) => {
  logger.log("silly", "Received GET request.");

  res.send({
    message: "This is the USI JSON Schema Validator. Please POST to this endpoint the schema and object to validate structured as in bodyStructure. For more information and examples on how to use the validator see https://github.com/EMBL-EBI-SUBS/json-schema-validator",
    bodyStructure: {
      schema: {},
      object: {}
    }
  });
});

app.listen(port, () => {
  logger.log("info", ` -- Started server on port ${port} --`);
  if(argv.logPath) { logger.log("info", ` --> Log output: ${argv.logPath}`); }
});

// -- For monitoring purposes --//
const pidPath = argv.pidPath || "./server.pid";
try {
  let pid = npid.create(pidPath);
  pid.removeOnExit();
} catch(err) {
  logger.log("error", err);
  process.exit(1);
}

// Handles crt + c event
process.on("SIGINT", () => {
  npid.remove(pidPath);
  process.exit();
});

// Handles kill -USR1 pid event
process.on("SIGUSR1", () => {
  npid.remove(pidPath);
  process.exit();
});
