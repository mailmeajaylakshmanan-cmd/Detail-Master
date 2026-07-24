const secureFind = (model, query) => {
  return model.find(query);
};

const secureFindOne = (model, query) => {
  return model.findOne(query);
};

module.exports = {
  secureFind,
  secureFindOne
};
