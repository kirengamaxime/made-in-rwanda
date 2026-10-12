// Defence in depth: strips operator-style ($...) and dotted keys from user input. SQL is parameterized separately.
const clean = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  Object.keys(obj).forEach((key) => {
    if (key.startsWith('$') || key.includes('.')) {
      delete obj[key];
    } else if (typeof obj[key] === 'object') {
      clean(obj[key]);
    }
  });
  return obj;
};

module.exports = (req, res, next) => {
  clean(req.body);
  clean(req.query);
  clean(req.params);
  next();
};
