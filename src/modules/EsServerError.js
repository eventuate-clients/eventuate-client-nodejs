export default class EsServerError extends Error {

  constructor(jsonBody) {

    super();
    Error.captureStackTrace(this);

    this.name = 'ES Server Error';

    if (typeof (jsonBody) == 'object') {
      this.timestamp = jsonBody.timestamp;
      this.status = jsonBody.status;
      this.statusCode = jsonBody.statusCode;
      this.error = jsonBody.error;
      this.exception = jsonBody.exception;

      if (typeof jsonBody.message == 'object') {
        jsonBody.message = JSON.stringify(jsonBody.message);
      }

      this.message = jsonBody.message;
      this.path = jsonBody.path;

    } else {

      this.message = jsonBody;
    }


  }
}

export default EsServerError;