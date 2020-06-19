var adapterFor = (function () {
  var url = require("url"),
    adapters = {
      "http:": require("http"),
      "https:": require("https"),
    };

  return function (inputUrl) {
    return adapters[url.parse(inputUrl).protocol];
  };
})();

module.exports = async (externalMaps) => {
  return new Promise((resolve) => {
    let externalMapsParsed = {};
    let activeRequests = 0;
    for (const mapName in externalMaps) {
      activeRequests++;
      const map = externalMaps[mapName];
      adapterFor(map)
        .get(map, function (res) {
          const { statusCode } = res;

          let error;
          if (statusCode !== 200) {
            error = new Error(
              "Request Failed.\n" + `Status Code: ${statusCode}`
            );
          }

          res.setEncoding("utf8");
          let rawData = "";
          res.on("data", (chunk) => {
            rawData += chunk;
          });
          res.on("end", () => {
            try {
              const parsedData = JSON.parse(rawData);
              externalMapsParsed[mapName] = parsedData;
              activeRequests--;
              if (activeRequests == 0) {
                resolve(externalMapsParsed);
              }
            } catch (e) {
              console.error(e.message);
            }
          });
        })
        .on("error", (err) => {
          console.log(err);
          activeRequests--;
          if (activeRequests == 0) {
            resolve(externalMapsParsed);
          }
        })
        .setTimeout(6000, function () {
          console.log("timeout");
          activeRequests--;
          if (activeRequests == 0) {
            resolve(externalMapsParsed);
          }
        });
    }
    if (activeRequests == 0) {
      resolve(externalMapsParsed);
    }
  });
};
