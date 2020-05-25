const http = require("http");
const url = require("url");

module.exports = async (externalMaps) => {
  return new Promise((resolve) => {
    let externalMapsParsed = {};
    let activeRequests = 0;
    for (const mapName in externalMaps) {
      activeRequests++;
      const map = externalMaps[mapName];
      http.get(map, function (res) {
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
      });
    }
  });
};
