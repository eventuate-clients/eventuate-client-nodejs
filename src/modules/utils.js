import util from 'util';

export const parseIsTrue = val => {
  return /^(?:t(?:rue)?|yes?|1+)$/i.test(val);
};

export const parseJSON = (v) => {

  return new Promise((resolve, reject) => {
    if (typeof v == 'object') {
      return resolve(v);
    }

    resolve(JSON.parse(v));
  });
};


export const retryNTimes = ({ times, fn, ctx, errConditionFn }) => {


  if (typeof errConditionFn !== 'function') {
    errConditionFn = err => err;
  }

  return function () {

    var args = [].slice.call(arguments);

    return new Promise((resolve, reject) => {
      var count = times;
      let innerCtx = this || ctx;

      var worker = function () {
        fn.apply(innerCtx, args)
          .then(result => {

            return resolve(result);
          })
          .catch(err => {

            console.error(err);
            if (errConditionFn(err)) {

              count--;

              if (!count) {
                return reject(err);
              }

              console.log(`retryNTimes  ${count} - ${worker.name}() - ${util.inspect(args)}`);
              setTimeout(worker, 100);

              return;
            }

            reject(err);
          });
      };

      worker();
    });
  };
};
