import util from 'util';

export const parseIsTrue = val => /^(?:t(?:rue)?|yes?|1+)$/i.test(val);

export const retryNTimes = ({ times, fn, ctx, errConditionFn }) => {

  return function (...args) {

    return new Promise((resolve, reject) => {
      let count = times;
      let innerCtx = this || ctx;

      const worker = function () {
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

export const delay = (timeout) => new Promise((resolve) => setTimeout(resolve, timeout));