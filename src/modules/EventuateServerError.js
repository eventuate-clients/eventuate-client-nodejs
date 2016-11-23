export default class EventuateServerError extends Error {

  constructor(jsonBody) {

    super();
    Error.captureStackTrace(this);

    this.name = 'ES Server Error';

    if (typeof (jsonBody) == 'object') {

      const { timestamp, status, statusCode, error, exception, message } = jsonBody;

      this.timestamp = timestamp;
      this.status = status;
      this.statusCode = statusCode;
      this.error = error;
      this.exception = exception;

      if (typeof message == 'object') {
        jsonBody.message = JSON.stringify(jsonBody.message);
      }

      this.message = jsonBody.message;
      this.path = jsonBody.path;

    } else {
      this.message = jsonBody;
    }
  }
}
