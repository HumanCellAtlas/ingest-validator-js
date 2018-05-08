var Ajv = require("ajv");
var DefFunc = require("./ischildtermof");
const ValidationError = require("./validation-error");

var ajv = new Ajv({allErrors: true});
var defFunc = new DefFunc(ajv);

function runValidation(inputSchema, inputObject) {
  return new Promise((resolve, reject) => {
    var validate = ajv.compile(inputSchema);
    Promise.resolve(validate(inputObject))
    .then((data) => {
        if (validate.errors) {
          // For debug reasons
          console.log(validate.errors);
          
          resolve(convertToValidationErrors(validate.errors));
        } else {
          resolve([]);
        }
      }
    ).catch((err, errors) => {
      if (!(err instanceof Ajv.ValidationError)) {
        throw err;
      }
      console.log(ajv.errorsText(err.errors));
      resolve(err.errors);
    });
  });
}

module.exports = runValidation;

function convertToValidationErrors(ajvErrorObjects) {
  let errors = [];
  ajvErrorObjects.forEach( errorObject => {
    errors.push(
      new ValidationError([errorObject.message], errorObject.dataPath, errorObject.params.missingProperty)
    )
  });
  return errors;
}
