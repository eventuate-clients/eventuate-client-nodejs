
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
