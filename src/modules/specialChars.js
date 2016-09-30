export const escapeStr = str => {

  return str
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\c')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n');
};

export const unEscapeStr = str => {

  return str
    .replace(/\\c/g, ':')
    .replace(/\\r/g, '\r')
    .replace(/\\n/g, '\n');
};
