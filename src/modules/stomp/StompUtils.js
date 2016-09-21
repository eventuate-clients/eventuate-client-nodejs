
export class StompLogging {
  constructor(should_debug) {
    this.should_debug = should_debug;
  }

  debug(message) {
    if (this.should_debug) {
      console.log("debug: " + message);
    }
  }

  warn(message) {
    console.log("warn: " + message);
  }

  error(message, die) {
    console.log("error: " + message);
    if (die) {
      process.exit(1);
    }
  }

  die(message) {
    this.error(message, true);
  }
}


export const reallyDefined = varToTest => {
  return !(varToTest == null || varToTest == undefined);
};
