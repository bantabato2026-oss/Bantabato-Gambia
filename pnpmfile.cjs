module.exports = {
  hooks: {
    readPackage(pkg) {
      if (pkg.name === "express" || pkg.name === "body-parser") {
        pkg.dependencies = { ...(pkg.dependencies || {}), qs: "6.16.0" };
      }
      return pkg;
    },
  },
};
