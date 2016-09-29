
export const parseIsTrue = val => {
  return /^(?:t(?:rue)?|yes?|1+)$/i.test(val);
};

export const toJSON = (v, callback) => {

  if (typeof (v) == 'object') {
    return callback(null, v);
  }

  try {
    callback(null, JSON.parse(v));
  } catch (err) {
    callback(err);
  }
};
