const xlsx = require("node-xlsx");
const CustomError = require("./Error");
const { HTTP_CODES } = require("../config/Enum");

class Import {
  constructor() {}
  fromExcel(filePath) {
    let workSheets = xlsx.parse(filePath);
    if (!workSheets || !workSheets.length) {
      throw new CustomError(
        HTTP_CODES.BAD_REQUEST,
        "Invalid File",
        "Invalid File"
      );
    }
    let rows = workSheets[0].data;

    if (!rows.length) {
      throw new CustomError(
        HTTP_CODES.NOT_ACCEPTABLE,
        "File is empty",
        "File is empty"
      );
    }
    return rows;
  }
}

module.exports = new Import();
