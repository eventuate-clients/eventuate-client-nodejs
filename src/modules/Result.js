
export default class Result {
  constructor({ resolve, reject, callback }){
/*
    console.log('resolve:', resolve)
    console.log('reject:', reject);
    console.log('callback:', callback);*/
    Object.assign(this, { resolve, reject, callback });
  }

  success(result) {

    if (this.callback) {
      this.callback(null, result);
    }

    this.resolve(result);
  }

  failure(err) {
    if (this.callback) {
      this.callback(err);
    }

    this.reject(err);
  }
}